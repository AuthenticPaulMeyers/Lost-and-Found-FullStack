# uFoundIt Backend — Improvement Recommendations

This document outlines targeted improvements for the three implemented phases of the
uFoundIt backend: **Phase 1 (Auth & Users)**, **Phase 2 (Item Management)**, and
**Phase 3 (Claiming & Verification)**. Recommendations are grouped by category:
Performance, Security, and Usability.

---

## 1. Performance

### 1.1 Database: Replace SQLite with PostgreSQL

**Affected Phase:** All  
**Current State:** `settings.py` uses SQLite (`django.db.backends.sqlite3`).

SQLite is not suitable for multi-user concurrent access. Under load, write operations are
serialised and will create lock contention, especially for the Claims workflow where
`approve`, `resolve`, and `reject` all write simultaneously.

> **Recommendation:** Switch to PostgreSQL (already commented out in `settings.py`).
> PostgreSQL supports concurrent writes, partial indexes, and full-text search that will
> benefit all three phases.

---

### 1.2 N+1 Query Risk in Claims List

**Affected Phase:** Phase 3  
**Current State:** `ClaimViewSet.get_queryset()` filters claims but does not use
`select_related` or `prefetch_related`.

```python
# Current — will cause N+1 queries when serializing item and claimer
return Claim.objects.filter(Q(claimer=user_profile) | Q(item__poster=user_profile)).distinct()
```

> **Recommendation:** Add `select_related` to eagerly fetch related objects in a single
> SQL query.

```python
return Claim.objects.filter(
    Q(claimer=user_profile) | Q(item__poster=user_profile)
).select_related('item__poster__user', 'claimer__user').distinct()
```

---

### 1.3 Missing `select_related` on Item Queryset (poster)

**Affected Phase:** Phase 2  
**Current State:** `ItemViewSet.get_queryset()` does `prefetch_related('images', 'category')`
but does not eagerly load `poster__user`.  

When serialising `ItemDetailSerializer`, accessing `obj.poster.full_name` and
`obj.poster.user.username` triggers separate database hits per item.

> **Recommendation:**

```python
queryset = Item.objects.all().select_related('poster__user').prefetch_related('images', 'category')
```

---

### 1.4 No Caching on Read-Heavy Endpoints

**Affected Phase:** Phase 2  
**Current State:** Category list (`/api/categories/`) and public item list
(`/api/items/`) are queried from the database on every request with no caching layer.

> **Recommendation:** Apply Django's `cache_page` decorator or a Redis-based cache to
> read-only, low-change endpoints like categories. This will reduce database load
> significantly as user numbers grow.

```python
from django.views.decorators.cache import cache_page
from django.utils.decorators import method_decorator

@method_decorator(cache_page(60 * 5), name='list')  # Cache for 5 minutes
class ItemCategoryViewSet(viewsets.ReadOnlyModelViewSet):
    ...
```

---

### 1.5 No Pagination on Claims List

**Affected Phase:** Phase 3  
**Current State:** `ClaimViewSet` does not define a `pagination_class`. While the global
`PAGE_SIZE = 20` applies, a power user who has posted many items (e.g., a campus
department account) may have hundreds of incoming claims. No cursor-based pagination is
in place.

> **Recommendation:** Add explicit pagination to `ClaimViewSet` and consider switching to
> `CursorPagination` for the claims list to avoid large offset queries.

---

### 1.6 Image Uploads Are Not Validated for Size or Type

**Affected Phase:** Phase 2  
**Current State:** `ItemDetailSerializer` accepts `uploaded_images` as `ImageField` items.
There are no server-side size limits enforced in the serializer or view — only the
`max_length=1000000` on the field argument (which refers to filename length, not file size).

> **Recommendation:** Add an explicit file size validator to the serializer.

```python
def validate_uploaded_images(self, images):
    MAX_SIZE = 5 * 1024 * 1024  # 5 MB
    for image in images:
        if image.size > MAX_SIZE:
            raise serializers.ValidationError("Each image must be under 5 MB.")
    return images
```

---

## 2. Security

### 2.1 `import` Statement Inside a View Function

**Affected Phase:** Phase 3  
**Current State:** The `resolve` action in `ClaimViewSet` imports `timezone` inside the
function body.

```python
# claims/views.py — bad practice, minor performance hit on every call
import django.utils.timezone as timezone
```

> **Recommendation:** Move the import to the top of the file. While minor, imports inside
> functions can mask circular import issues and are against Python conventions.

---

### 2.2 No Rate Limiting on Claim Creation

**Affected Phase:** Phase 3  
**Current State:** Global throttle rates are set to `1000/hour` for authenticated users.
A malicious or buggy client could spam `POST /api/claims/` for the same item, and while
the `unique_together = ('item', 'claimer')` constraint would block duplicates at the DB
level, it would do so only *after* hitting the database — and the error response is a raw
DB integrity error, not a user-friendly one.

> **Recommendation:** Add a custom throttle class specifically for claim creation, and
> ensure the `IntegrityError` from a duplicate claim is caught and returned as a clean
> `400 Bad Request`.

```python
class ClaimCreateThrottle(UserRateThrottle):
    rate = '10/hour'
```

---

### 2.3 Logout Does Not Blacklist the Refresh Token

**Affected Phase:** Phase 1  
**Current State:** The `LogoutView` returns a success message but does not actually
invalidate the user's refresh token.

```python
def post(self, request):
    # Note: SimpleJWT handles token blacklisting through settings
    return Response({'message': 'Logged out successfully'}, status=status.HTTP_200_OK)
```

Even with `BLACKLIST_AFTER_ROTATION = True`, a stolen refresh token remains valid until
expiry (1 day by default).

> **Recommendation:** Implement proper token blacklisting in the logout view.

```python
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.exceptions import TokenError

def post(self, request):
    try:
        refresh_token = request.data.get('refresh')
        token = RefreshToken(refresh_token)
        token.blacklist()
        return Response({'message': 'Logged out successfully'}, status=status.HTTP_200_OK)
    except TokenError:
        return Response({'error': 'Invalid or expired token.'}, status=status.HTTP_400_BAD_REQUEST)
```

> This requires `djangorestframework-simplejwt[crypto]` and the `token_blacklist` app to
> be added to `INSTALLED_APPS`.

---

### 2.4 Reputation Score Can Be Freely Manipulated

**Affected Phase:** Phase 3  
**Current State:** The `reputation_score` field on `UserProfile` is an `IntegerField` with
no constraints beyond `min(100, ...)` in the Python method. Since `UserProfileSerializer`
lists `reputation_score` in its `read_only_fields`, it is protected for the serializer
that handles updates — but the field itself is not protected at the model level.

> **Recommendation:** Use a property/signal pattern so `reputation_score` is always
> computed or guarded, and consider adding a `MinValueValidator(0)` and
> `MaxValueValidator(100)` at the model level.

---

### 2.5 `CORS_ALLOWED_ORIGINS` Fallback Allows All Local Origins

**Affected Phase:** All  
**Current State:** `settings.py` has a broad CORS fallback for development, but
`CORS_ALLOW_CREDENTIALS = True` makes this dangerous if the origin list is ever too
permissive in a staging/production environment.

> **Recommendation:** Explicitly fail-safe in non-`DEBUG` mode by requiring
> `CORS_ALLOWED_ORIGINS` to be set via environment variable, with no default.

```python
if not DEBUG:
    CORS_ALLOWED_ORIGINS = os.getenv('CORS_ALLOWED_ORIGINS', '').split(',')
```

---

### 2.6 No Claim Ownership Check on `retrieve`/`update`/`destroy`

**Affected Phase:** Phase 3  
**Current State:** `ClaimViewSet` uses `get_queryset()` to scope the query to relevant
users. However, the ViewSet inherits all CRUD actions from `ModelViewSet`, meaning a
user could theoretically `PATCH` or `DELETE` a claim they only *received* (as an item
poster) but that they didn't create.

> **Recommendation:** Add a `IsClaimerOrReadOnly` custom permission or override
> `perform_update`/`perform_destroy` to enforce that only the claimer can edit or delete
> their own claim.

---

## 3. Usability

### 3.1 No Notification on Claim Status Change

**Affected Phase:** Phase 3  
**Current State:** When a poster approves, rejects, or resolves a claim, the claimer
receives no notification. The `notifications` and `chat` apps are stubbed out but not
connected to the claims workflow.

> **Recommendation:** Trigger an in-app notification (and optionally an email) to the
> claimer when their claim status changes. A Django signal on the `Claim` model is the
> cleanest approach.

```python
# apps/claims/signals.py
from django.db.models.signals import post_save
from django.dispatch import receiver

@receiver(post_save, sender=Claim)
def notify_claimer_on_status_change(sender, instance, **kwargs):
    if instance.tracker.has_changed('status'):
        # Create a Notification object or send an email
        pass
```

---

### 3.2 Verification Question Is Not Enforced for `found` Items

**Affected Phase:** Phase 3  
**Current State:** `verification_question` is an optional `blank=True` field on `Item`.
There is no API-level validation that forces a finder to set a question when posting a
`found` item, which undermines the Q&A verification purpose.

> **Recommendation:** Add a serializer-level validation rule: if `item_type == 'found'`,
> then `verification_question` must be non-empty.

```python
def validate(self, attrs):
    if attrs.get('item_type') == 'found' and not attrs.get('verification_question', '').strip():
        raise serializers.ValidationError({
            'verification_question': 'A verification question is required for found items.'
        })
    return attrs
```

---

### 3.3 Claim Serializer Does Not Return the Verification Question

**Affected Phase:** Phase 3  
**Current State:** `ClaimSerializer` embeds `item_details` using `ItemListSerializer`,
which is the summary serializer. The `verification_question` is only on
`ItemDetailSerializer`, so a claimer who calls `GET /api/claims/` cannot see what
question they should be answering when their claim is reviewed.

> **Recommendation:** Either switch `item_details` to use `ItemDetailSerializer`, or add
> `verification_question` explicitly to `ItemListSerializer` so it surfaces in claim
> responses.

---

### 3.4 No Way for a User to Cancel Their Own Claim

**Affected Phase:** Phase 3  
**Current State:** The public API has `approve`, `reject`, and `resolve` actions for the
**poster**, but there is no action for the **claimer** to withdraw a pending claim they
submitted by mistake.

> **Recommendation:** Add a `cancel` action restricted to the claimer.

```python
@action(detail=True, methods=['post'])
def cancel(self, request, pk=None):
    claim = self.get_object()
    if claim.claimer.user != request.user:
        return Response({'error': 'You can only cancel your own claims.'}, status=403)
    if claim.status != 'pending':
        return Response({'error': 'Only pending claims can be cancelled.'}, status=400)
    claim.status = 'rejected'
    claim.save()
    return Response({'status': 'claim cancelled'})
```

---

### 3.5 Reputation Level Thresholds Are Not Documented or Configurable

**Affected Phase:** Phase 1 & 3  
**Current State:** The `get_reputation_level()` method hard-codes thresholds of 80, 60,
and 40.

```python
def get_reputation_level(self):
    if self.reputation_score >= 80:
        return "Excellent"
    elif self.reputation_score >= 60:
        ...
```

> **Recommendation:** Move these thresholds to a named constant or Django setting, and
> ensure the API response also returns the numeric score alongside the level so the
> frontend can render progress bars or indicators accurately.

---

### 3.6 Profile `me` Endpoint Does Not Return Verification Status

**Affected Phase:** Phase 1  
**Current State:** `GET /api/profiles/me/` returns the full profile but not the nested
`verification_status` (email_verified, phone_verified, etc.). A user has to make a
separate call to `/api/verification/my_status/` to see their verification progress.

> **Recommendation:** Embed a simplified verification summary directly into the
> `UserProfileSerializer` response, so the common case of "display the user's dashboard"
> requires only one API call.

---


