"""
Serializers for user authentication and profile management
"""

from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from django.contrib.auth.models import User
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from .models import UserProfile, UserVerification


class UserSerializer(serializers.ModelSerializer):
    """Basic User serializer"""

    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name']
        read_only_fields = ['id']


class UserVerificationSerializer(serializers.ModelSerializer):
    """Serializer for UserVerification status"""

    verification_percentage = serializers.SerializerMethodField()
    is_fully_verified = serializers.SerializerMethodField()

    class Meta:
        model = UserVerification
        fields = [
            'id', 'user_profile', 'email_verified', 'email_verified_at',
            'domain_verified', 'domain_verification_status', 'university_domain',
            'phone_verified', 'phone_verified_at', 'verification_percentage',
            'is_fully_verified', 'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'email_verification_token', 'email_verification_sent_at',
            'phone_verification_code', 'created_at', 'updated_at',
            'verification_percentage', 'is_fully_verified'
        ]

    def get_verification_percentage(self, obj):
        """Get verification percentage"""
        return obj.get_verification_percentage()

    def get_is_fully_verified(self, obj):
        """Check if user is fully verified"""
        return obj.is_fully_verified()


class UserProfileSerializer(serializers.ModelSerializer):
    """Serializer for UserProfile with basic user info"""

    user = UserSerializer(read_only=True)
    reputation_level = serializers.SerializerMethodField()
    profile_picture_url = serializers.SerializerMethodField()
    verification_status = UserVerificationSerializer(read_only=True)

    class Meta:
        model = UserProfile
        fields = [
            'id', 'user', 'full_name', 'phone_number', 'university_email',
            'profile_picture', 'profile_picture_url', 'bio', 'is_verified',
            'verification_date', 'reputation_score', 'reputation_level',
            'total_items_found', 'total_items_lost', 'total_successful_claims',
            'verification_badge_eligible', 'campus_location', 'created_at',
            'updated_at', 'last_active', 'verification_status'
        ]
        read_only_fields = [
            'id', 'created_at', 'updated_at', 'last_active', 'reputation_score',
            'reputation_level', 'total_items_found', 'total_items_lost',
            'total_successful_claims', 'verification_badge_eligible',
            'verification_status'
        ]

    def get_reputation_level(self, obj):
        """Get human-readable reputation level"""
        return obj.get_reputation_level()

    def get_profile_picture_url(self, obj):
        """Get full URL for profile picture"""
        if obj.profile_picture:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.profile_picture.url)
            return obj.profile_picture.url
        return None




class RegisterSerializer(serializers.ModelSerializer):
    """
    Serializer for user registration
    Creates both User and UserProfile
    """

    password = serializers.CharField(
        write_only=True, required=True, validators=[validate_password],
        help_text="Password must be at least 8 characters"
    )
    password2 = serializers.CharField(write_only=True, required=True)
    university_email = serializers.EmailField(required=False, allow_null=True)
    full_name = serializers.CharField(max_length=255, required=True)
    campus_location = serializers.CharField(max_length=255, required=False, allow_blank=True)

    class Meta:
        model = User
        fields = [
            'username', 'email', 'password', 'password2', 'full_name',
            'university_email', 'campus_location'
        ]

    def validate(self, attrs):
        """Validate password match"""
        if attrs['password'] != attrs.pop('password2'):
            raise serializers.ValidationError(
                {'password': 'Passwords do not match'}
            )

        # Removed university domain validation to allow normal gmail accounts
        return attrs

    def validate_email(self, value):
        """Check that the email is unique"""
        if User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError("A user with this email already exists.")
        return value

    def create(self, validated_data):
        """Create user and associated profile"""
        # Extract profile-specific data
        university_email = validated_data.pop('university_email', None)
        full_name = validated_data.pop('full_name')
        campus_location = validated_data.pop('campus_location', '')

        # Use email as username if not provided or to ensure uniqueness
        if 'username' not in validated_data or not validated_data['username']:
            email = validated_data.get('email')
            # Generate a clean username from email
            base_username = email.split('@')[0]
            username = base_username
            counter = 1
            while User.objects.filter(username=username).exists():
                username = f"{base_username}{counter}"
                counter += 1
            validated_data['username'] = username

        # Create Django User
        user = User.objects.create_user(**validated_data)

        # Create UserProfile
        user_profile = UserProfile.objects.create(
            user=user,
            university_email=university_email,
            full_name=full_name,
            campus_location=campus_location,
        )

        # Create UserVerification
        UserVerification.objects.create(user_profile=user_profile)

        return user


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    """
    Custom JWT token serializer that includes user profile info
    """

    @classmethod
    def get_token(cls, user):
        """Customize token claims to include user profile info"""
        token = super().get_token(user)

        # Add custom claims
        try:
            profile = user.profile
            token['full_name'] = profile.full_name
            token['is_verified'] = profile.is_verified
            token['verification_badge_eligible'] = profile.verification_badge_eligible
        except UserProfile.DoesNotExist:
            pass

        return token

    def validate(self, attrs):
        """Override to return user data along with token"""
        data = super().validate(attrs)

        # Add user profile data to response
        user = self.user
        try:
            profile = user.profile
            data['user'] = {
                'id': str(profile.id),
                'username': user.username,
                'email': user.email,
                'full_name': profile.full_name,
                'is_verified': profile.is_verified,
                'verification_badge_eligible': profile.verification_badge_eligible,
            }
        except UserProfile.DoesNotExist:
            data['user'] = {
                'id': user.id,
                'username': user.username,
                'email': user.email,
            }

        return data


class ChangePasswordSerializer(serializers.Serializer):
    """Serializer for changing password"""

    old_password = serializers.CharField(write_only=True, required=True)
    new_password = serializers.CharField(
        write_only=True, required=True,
        validators=[validate_password]
    )
    new_password2 = serializers.CharField(write_only=True, required=True)

    def validate(self, attrs):
        """Validate passwords match"""
        if attrs['new_password'] != attrs.pop('new_password2'):
            raise serializers.ValidationError(
                {'new_password': 'Passwords do not match'}
            )
        return attrs

    def validate_old_password(self, value):
        """Validate old password is correct"""
        user = self.context['request'].user
        if not user.check_password(value):
            raise serializers.ValidationError(
                'Old password is not correct'
            )
        return value

    def save(self, **kwargs):
        """Save new password"""
        user = self.context['request'].user
        user.set_password(self.validated_data['new_password'])
        user.save()
        return user


class ProfileUpdateSerializer(serializers.ModelSerializer):
    """Serializer for updating user profile"""

    class Meta:
        model = UserProfile
        fields = [
            'full_name', 'phone_number', 'profile_picture', 'bio',
            'campus_location'
        ]
