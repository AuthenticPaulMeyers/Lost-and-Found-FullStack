from rest_framework import viewsets, permissions, filters
from django_filters.rest_framework import DjangoFilterBackend
from django.utils.decorators import method_decorator
from django.views.decorators.cache import cache_page
from .models import Item, ItemCategory
from .serializers import (
    ItemCategorySerializer, ItemListSerializer, ItemDetailSerializer
)

@method_decorator(cache_page(60 * 5), name='list')  # Cache for 5 minutes
class ItemCategoryViewSet(viewsets.ReadOnlyModelViewSet):
    """
    API endpoint that allows item categories to be viewed.
    """
    queryset = ItemCategory.objects.all()
    serializer_class = ItemCategorySerializer
    permission_classes = [permissions.IsAuthenticated]

class IsPosterOrReadOnly(permissions.BasePermission):
    """
    Custom permission to only allow posters of an item to edit it.
    """
    def has_object_permission(self, request, view, obj):
        if request.method in permissions.SAFE_METHODS:
            return True
        return obj.poster.user == request.user

class ItemViewSet(viewsets.ModelViewSet):
    """
    API endpoint that allows items to be viewed or edited.
    """
    queryset = Item.objects.all()
    permission_classes = [permissions.IsAuthenticated, IsPosterOrReadOnly]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['item_type', 'status', 'category']
    search_fields = ['title', 'description', 'location_name']
    ordering_fields = ['created_at', 'date_found_lost']

    def get_serializer_class(self):
        if self.action == 'list':
            return ItemListSerializer
        return ItemDetailSerializer

    def perform_create(self, serializer):
        serializer.save(poster=self.request.user.profile)

    def get_queryset(self):
        """
        Relation map resolved per serializer:
          list   -> ItemListSerializer  accesses: poster__user, category, images
          detail -> ItemDetailSerializer accesses: poster__user, category, images

        select_related handles single-valued FK/OneToOne joins in one SQL query.
        prefetch_related handles the reverse-FK images in a separate batched query.
        """
        queryset = (
            Item.objects.all()
            .select_related(
                'poster__user',   # ItemListSerializer.get_poster_name & IsPosterOrReadOnly
                'category',       # FK — cheaper as a join than a prefetch
            )
            .prefetch_related('images')  # Reverse-FK: ItemImage set per item
        )

        # Default the list action to active items only unless caller filters explicitly
        if self.action == 'list':
            status_param = self.request.query_params.get('status')
            if not status_param:
                queryset = queryset.filter(status='active')

        return queryset
