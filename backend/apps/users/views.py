"""
Views for user authentication and profile management
"""

from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from django.contrib.auth.models import User
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.exceptions import TokenError
from .models import UserProfile, UserVerification
from .serializers import (
    UserSerializer, UserProfileSerializer, UserVerificationSerializer,
    RegisterSerializer, CustomTokenObtainPairSerializer,
    ChangePasswordSerializer, ProfileUpdateSerializer
)


class RegisterView(APIView):
    """
    User registration endpoint
    POST: Register new user with profile
    """
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        """Create new user account"""
        serializer = RegisterSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()
            return Response(
                {
                    'message': 'User registered successfully',
                    'user_id': str(user.profile.id),
                    'username': user.username,
                },
                status=status.HTTP_201_CREATED
            )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class CustomTokenObtainPairView(TokenObtainPairView):
    """
    JWT token obtain endpoint
    Returns access and refresh tokens along with user info
    """
    serializer_class = CustomTokenObtainPairSerializer
    permission_classes = [permissions.AllowAny]


class TokenRefreshViewCustom(TokenRefreshView):
    """
    JWT token refresh endpoint
    Refreshes access token using refresh token
    """
    permission_classes = [permissions.AllowAny]


class LogoutView(APIView):
    """
    Logout view — blacklists the submitted refresh token so it cannot be
    used to obtain new access tokens, even before its natural expiry.
    Requires 'rest_framework_simplejwt.token_blacklist' in INSTALLED_APPS.
    POST body: { "refresh": "<refresh_token>" }
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        """Blacklist the provided refresh token and log the user out."""
        refresh_token = request.data.get('refresh')
        if not refresh_token:
            return Response(
                {'error': 'Refresh token is required.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        try:
            token = RefreshToken(refresh_token)
            token.blacklist()
            return Response(
                {'message': 'Logged out successfully.'},
                status=status.HTTP_200_OK
            )
        except TokenError:
            return Response(
                {'error': 'Invalid or already expired token.'},
                status=status.HTTP_400_BAD_REQUEST
            )


class UserProfileViewSet(viewsets.ViewSet):
    """
    ViewSet for user profile management
    Handles get, update, and statistics
    """
    permission_classes = [permissions.IsAuthenticated]

    def list(self, request):
        """List user profiles (simplified - only public profiles)"""
        profiles = UserProfile.objects.filter(is_verified=True)
        serializer = UserProfileSerializer(
            profiles, many=True, context={'request': request}
        )
        return Response(serializer.data)

    def retrieve(self, request, pk=None):
        """Get specific user profile"""
        try:
            profile = UserProfile.objects.get(id=pk)
            serializer = UserProfileSerializer(profile, context={'request': request})
            return Response(serializer.data)
        except UserProfile.DoesNotExist:
            return Response(
                {'error': 'User profile not found'},
                status=status.HTTP_404_NOT_FOUND
            )

    def partial_update(self, request, pk=None):
        """Update user profile (authenticated user only)"""
        try:
            profile = UserProfile.objects.get(id=pk)

            # Ensure user can only update their own profile
            if profile.user != request.user:
                return Response(
                    {'error': 'You can only update your own profile'},
                    status=status.HTTP_403_FORBIDDEN
                )

            serializer = ProfileUpdateSerializer(
                profile, data=request.data, partial=True
            )
            if serializer.is_valid():
                serializer.save()
                return Response(serializer.data)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        except UserProfile.DoesNotExist:
            return Response(
                {'error': 'User profile not found'},
                status=status.HTTP_404_NOT_FOUND
            )

    @action(detail=True, methods=['get'], permission_classes=[permissions.IsAuthenticated])
    def stats(self, request, pk=None):
        """Get user statistics"""
        try:
            profile = UserProfile.objects.get(id=pk)
            data = {
                'total_items_found': profile.total_items_found,
                'total_items_lost': profile.total_items_lost,
                'total_successful_claims': profile.total_successful_claims,
                'reputation_score': profile.reputation_score,
                'reputation_level': profile.get_reputation_level(),
                'verification_badge_eligible': profile.verification_badge_eligible,
            }
            return Response(data)
        except UserProfile.DoesNotExist:
            return Response(
                {'error': 'User profile not found'},
                status=status.HTTP_404_NOT_FOUND
            )

    @action(detail=True, methods=['get'], permission_classes=[permissions.IsAuthenticated])
    def reputation(self, request, pk=None):
        """Get user reputation and verification status"""
        try:
            profile = UserProfile.objects.get(id=pk)
            verification = profile.verification_status
            data = {
                'reputation_score': profile.reputation_score,
                'reputation_level': profile.get_reputation_level(),
                'verification_badge_eligible': profile.verification_badge_eligible,
                'is_verified': profile.is_verified,
                'verification_percentage': verification.get_verification_percentage(),
                'email_verified': verification.email_verified,
                'domain_verified': verification.domain_verified,
                'phone_verified': verification.phone_verified,
            }
            return Response(data)
        except UserProfile.DoesNotExist:
            return Response(
                {'error': 'User profile not found'},
                status=status.HTTP_404_NOT_FOUND
            )

    @action(detail=False, methods=['get'], permission_classes=[permissions.IsAuthenticated])
    def me(self, request):
        """Get current user's profile with lazy creation"""
        profile, created = UserProfile.objects.get_or_create(
            user=request.user,
            defaults={
                'full_name': f"{request.user.first_name} {request.user.last_name}".strip() or request.user.username
            }
        )
        if created:
            UserVerification.objects.get_or_create(user_profile=profile)
            
        serializer = UserProfileSerializer(profile, context={'request': request})
        return Response(serializer.data)

    @action(
        detail=False, methods=['post'],
        permission_classes=[permissions.IsAuthenticated]
    )
    def change_password(self, request):
        """Change user password"""
        serializer = ChangePasswordSerializer(
            data=request.data, context={'request': request}
        )
        if serializer.is_valid():
            serializer.save()
            return Response(
                {'message': 'Password changed successfully'},
                status=status.HTTP_200_OK
            )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(
        detail=False, methods=['patch'],
        permission_classes=[permissions.IsAuthenticated]
    )
    def update_profile(self, request):
        """Update current user's profile"""
        try:
            profile = request.user.profile
            serializer = ProfileUpdateSerializer(
                profile, data=request.data, partial=True
            )
            if serializer.is_valid():
                serializer.save()
                response_serializer = UserProfileSerializer(
                    profile, context={'request': request}
                )
                return Response(response_serializer.data)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        except UserProfile.DoesNotExist:
            return Response(
                {'error': 'Your user profile not found'},
                status=status.HTTP_404_NOT_FOUND
            )

    @action(
        detail=False, methods=['patch'],
        permission_classes=[permissions.IsAuthenticated]
    )
    def upload_avatar(self, request):
        """Upload profile picture"""
        try:
            profile = request.user.profile
            if 'profile_picture' not in request.FILES:
                return Response(
                    {'error': 'No image file provided'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            profile.profile_picture = request.FILES['profile_picture']
            profile.save()

            serializer = UserProfileSerializer(profile, context={'request': request})
            return Response(serializer.data)
        except UserProfile.DoesNotExist:
            return Response(
                {'error': 'Your user profile not found'},
                status=status.HTTP_404_NOT_FOUND
            )


class VerificationViewSet(viewsets.ViewSet):
    """ViewSet for user verification status"""
    permission_classes = [permissions.IsAuthenticated]

    def retrieve(self, request, pk=None):
        """Get verification status for a user"""
        try:
            profile = UserProfile.objects.get(id=pk)
            verification = profile.verification_status
            serializer = UserVerificationSerializer(verification)
            return Response(serializer.data)
        except UserProfile.DoesNotExist:
            return Response(
                {'error': 'User profile not found'},
                status=status.HTTP_404_NOT_FOUND
            )

    @action(detail=False, methods=['get'], permission_classes=[permissions.IsAuthenticated])
    def my_status(self, request):
        """Get current user's verification status"""
        try:
            profile = request.user.profile
            verification = profile.verification_status
            serializer = UserVerificationSerializer(verification)
            return Response(serializer.data)
        except UserProfile.DoesNotExist:
            return Response(
                {'error': 'Your user profile not found'},
                status=status.HTTP_404_NOT_FOUND
            )

