from rest_framework import permissions

class IsClaimerOrReadOnly(permissions.BasePermission):
    """
    Custom permission to only allow claimers to edit or delete their claims.
    Item posters can still view (GET/HEAD/OPTIONS).
    """

    def has_object_permission(self, request, view, obj):
        # Read permissions are allowed to any request,
        # so we'll always allow GET, HEAD or OPTIONS requests.
        # This allows the item poster to see the claim details.
        if request.method in permissions.SAFE_METHODS:
            return True

        # Allow write permissions to either the claimer (who made the claim)
        # or the original poster/finder of the item (who can approve/reject/resolve).
        try:
            is_claimer = obj.claimer.user == request.user
        except Exception:
            is_claimer = False

        try:
            is_item_poster = obj.item.poster.user == request.user
        except Exception:
            is_item_poster = False

        return is_claimer or is_item_poster
