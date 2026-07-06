"""
API URL Configuration
Main routing for all API endpoints
"""

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from apps.users.views import (
    RegisterView, CustomTokenObtainPairView, TokenRefreshViewCustom,
    LogoutView, UserProfileViewSet, VerificationViewSet
)
from apps.items.views import ItemViewSet, ItemCategoryViewSet
from apps.claims.views import ClaimViewSet

# Create router for ViewSets
router = DefaultRouter()
router.register(r'profiles', UserProfileViewSet, basename='userprofile')
router.register(r'verification', VerificationViewSet, basename='verification')
router.register(r'items', ItemViewSet, basename='item')
router.register(r'categories', ItemCategoryViewSet, basename='category')
router.register(r'claims', ClaimViewSet, basename='claim')

urlpatterns = [
    # Authentication endpoints
    path('auth/register/', RegisterView.as_view(), name='register'),
    path('auth/login/', CustomTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('auth/refresh/', TokenRefreshViewCustom.as_view(), name='token_refresh'),
    path('auth/logout/', LogoutView.as_view(), name='logout'),

    # ViewSet routes
    path('', include(router.urls)),

    # Future endpoints for other apps
    # path('items/', include('apps.items.urls')),
    # path('claims/', include('apps.claims.urls')),
    path('chat/', include('apps.chat.api_urls')),
    # path('notifications/', include('apps.notifications.urls')),
]
