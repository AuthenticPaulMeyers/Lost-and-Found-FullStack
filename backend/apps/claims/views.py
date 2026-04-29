from rest_framework import viewsets, permissions, status
from rest_framework.pagination import CursorPagination
from django.db.models import Q
from django.utils import timezone
from rest_framework.response import Response
from rest_framework.decorators import action
from django.db import IntegrityError
from .models import Claim
from .serializers import ClaimSerializer
from .throttles import ClaimCreateThrottle
from .permissions import IsClaimerOrReadOnly


class ClaimCursorPagination(CursorPagination):
    """
    Cursor pagination for reading claims, preventing deep offset queries
    when a user has many claims.
    """
    page_size = 20
    ordering = '-created_at'


class ClaimViewSet(viewsets.ModelViewSet):
    """
    API endpoint that allows claims to be created and viewed.

    get_queryset uses select_related and prefetch_related to eagerly load
    all nested relations accessed by ClaimSerializer in a fixed number of
    SQL queries, regardless of how many claims are returned.

    Relation map resolved here:
        claim
        ├── claimer  (UserProfile)
        │     └── user  (Django User)
        └── item  (Item)
              ├── poster  (UserProfile)
              │     └── user  (Django User)
              ├── category  (ItemCategory)
              └── images  (ItemImage — reverse FK, needs prefetch_related)
    """
    queryset = Claim.objects.all()
    serializer_class = ClaimSerializer
    permission_classes = [permissions.IsAuthenticated, IsClaimerOrReadOnly]
    pagination_class = ClaimCursorPagination

    def get_queryset(self):
        """
        Scope claims to those the current user is involved in:
          - Claims they submitted (as claimer), OR
          - Claims made on items they posted (as finder/poster)

        select_related resolves single-valued FKs in one JOIN query.
        prefetch_related resolves the reverse-FK images in a separate
        batched query — far cheaper than N individual queries.
        """
        user_profile = self.request.user.profile

        return (
            Claim.objects.filter(
                Q(claimer=user_profile) |
                Q(item__poster=user_profile)
            )
            .select_related(
                # Claimer branch
                'claimer__user',
                # Item branch + its poster branch
                'item__poster__user',
                'item__category',
            )
            .prefetch_related(
                # Reverse FK: Item → ItemImage (used by ItemListSerializer thumbnail)
                'item__images',
            )
            .distinct()
        )

    def get_throttles(self):
        """
        Apply a stricter throttle only for creating claims.
        """
        if self.action == 'create':
            return [ClaimCreateThrottle()]
        return super().get_throttles()

    def create(self, request, *args, **kwargs):
        """
        Override create to handle IntegrityError (duplicate claims) gracefully.
        """
        try:
            return super().create(request, *args, **kwargs)
        except IntegrityError:
            return Response(
                {"error": "You have already submitted a claim for this item."},
                status=status.HTTP_400_BAD_REQUEST
            )

    def perform_create(self, serializer):
        serializer.save(claimer=self.request.user.profile)

    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        """Approve a claim. Only the item poster can approve."""
        claim = self.get_object()
        if claim.item.poster.user != request.user:
            return Response(
                {'error': 'Only the person who found the item can approve claims.'},
                status=status.HTTP_403_FORBIDDEN
            )

        claim.status = 'approved'
        claim.save()

        item = claim.item
        item.status = 'pending'  # Pending final resolution/handover
        item.save()

        return Response({'status': 'claim approved'})

    @action(detail=True, methods=['post'])
    def resolve(self, request, pk=None):
        """Confirm that the item has been physically returned to the rightful owner."""
        claim = self.get_object()

        if claim.item.poster.user != request.user:
            return Response(
                {'error': 'Only the person who found the item can confirm resolution.'},
                status=status.HTTP_403_FORBIDDEN
            )

        if claim.status != 'approved':
            return Response(
                {'error': 'Claim must be approved before it can be resolved.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        claim.status = 'resolved'
        claim.resolved_at = timezone.now()
        claim.save()

        item = claim.item
        item.status = 'claimed'
        item.save()

        # Award reputation to the finder
        item.poster.increment_successful_claims()

        return Response({
            'status': 'item successfully returned',
            'poster_reputation': item.poster.reputation_score
        })

    @action(detail=True, methods=['post'])
    def reject(self, request, pk=None):
        """Reject a claim. Only the item poster can reject."""
        claim = self.get_object()
        if claim.item.poster.user != request.user:
            return Response(
                {'error': 'Only the person who found the item can reject claims.'},
                status=status.HTTP_403_FORBIDDEN
            )

        claim.status = 'rejected'
        claim.save()
        return Response({'status': 'claim rejected'})

    @action(detail=True, methods=['post'])
    def cancel(self, request, pk=None):
        """Allow a claimer to cancel their own pending claim."""
        claim = self.get_object()
        if claim.claimer.user != request.user:
            return Response(
                {'error': 'You can only cancel your own claims.'},
                status=status.HTTP_403_FORBIDDEN
            )
        if claim.status != 'pending':
            return Response(
                {'error': 'Only pending claims can be cancelled.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        claim.status = 'rejected'
        claim.save()
        return Response({'status': 'claim cancelled'})
