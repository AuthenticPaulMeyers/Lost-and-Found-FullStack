"""
User Profile Models for uFoundIt
Extended user model with reputation tracking and verification
"""

import uuid
from django.db import models
from django.contrib.auth.models import User
from django.core.validators import URLValidator, MinValueValidator, MaxValueValidator
from django.utils.translation import gettext_lazy as _


class UserProfile(models.Model):
    """
    Extended user profile with reputation, verification, and statistics
    One-to-One relationship with Django's built-in User model
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')

    # Personal Information
    full_name = models.CharField(max_length=255, blank=True)
    phone_number = models.CharField(max_length=20, blank=True)
    university_email = models.EmailField(unique=True, null=True, blank=True)  # Optional campus email
    profile_picture = models.ImageField(
        upload_to='profile_pictures/', null=True, blank=True
    )
    bio = models.TextField(max_length=500, blank=True)

    # Verification & Reputation
    is_verified = models.BooleanField(default=False)  # Email domain verified
    verification_date = models.DateTimeField(null=True, blank=True)
    reputation_score = models.IntegerField(
        default=0,
        validators=[MinValueValidator(0), MaxValueValidator(100)],
        help_text="User reputation score between 0 and 100"
    )

    # Statistics
    total_items_found = models.IntegerField(default=0)
    total_items_lost = models.IntegerField(default=0)
    total_successful_claims = models.IntegerField(default=0)

    # Verification Badge Logic
    # Badge awarded at 3+ successful claims for lost item recovery
    verification_badge_eligible = models.BooleanField(default=False)

    # Campus Location (for matching proximity)
    campus_location = models.CharField(
        max_length=255, blank=True, help_text="e.g., Main Library, Student Union"
    )

    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    last_active = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['university_email']),
            models.Index(fields=['is_verified']),
            models.Index(fields=['total_successful_claims']),
        ]

    def save(self, *args, **kwargs):
        """
        Enforce reputation score bounds before saving.
        """
        if self.reputation_score < 0:
            self.reputation_score = 0
        elif self.reputation_score > 100:
            self.reputation_score = 100
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.full_name or self.user.username} (@{self.user.username})"

    def award_verification_badge(self):
        """Award verification badge when user reaches 3+ successful claims"""
        if self.total_successful_claims >= 3 and not self.verification_badge_eligible:
            self.verification_badge_eligible = True
            self.reputation_score = min(100, self.reputation_score + 10)
            self.save()
            return True
        return False

    def increment_successful_claims(self):
        """Increment successful claim counter and check for badge eligibility"""
        self.total_successful_claims += 1
        self.reputation_score = min(100, self.reputation_score + 5)
        self.save()
        self.award_verification_badge()

    def get_reputation_level(self):
        """Return reputation level based on score"""
        if self.reputation_score >= 80:
            return "Excellent"
        elif self.reputation_score >= 60:
            return "Good"
        elif self.reputation_score >= 40:
            return "Fair"
        else:
            return "New"


class UserVerification(models.Model):
    """
    Track user verification status (email, phone, campus affiliation)
    """

    VERIFICATION_STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('verified', 'Verified'),
        ('rejected', 'Rejected'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user_profile = models.OneToOneField(
        UserProfile, on_delete=models.CASCADE, related_name='verification_status'
    )

    # Email Verification
    email_verified = models.BooleanField(default=False)
    email_verification_token = models.CharField(max_length=255, blank=True)
    email_verification_sent_at = models.DateTimeField(null=True, blank=True)
    email_verified_at = models.DateTimeField(null=True, blank=True)

    # University Domain Verification (e.g., @university.edu)
    university_domain = models.CharField(max_length=255, blank=True)
    domain_verified = models.BooleanField(default=False)
    domain_verification_status = models.CharField(
        max_length=20, choices=VERIFICATION_STATUS_CHOICES, default='pending'
    )

    # Phone Verification
    phone_verified = models.BooleanField(default=False)
    phone_verification_code = models.CharField(max_length=6, blank=True)
    phone_verified_at = models.DateTimeField(null=True, blank=True)

    # Created/Updated
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "User Verification"
        verbose_name_plural = "User Verifications"

    def __str__(self):
        return f"Verification for {self.user_profile}"

    def get_verification_percentage(self):
        """Calculate overall verification percentage"""
        verified_items = sum([
            int(self.email_verified),
            int(self.domain_verified),
            int(self.phone_verified),
        ])
        return (verified_items / 3) * 100

    def is_fully_verified(self):
        """Check if user is fully verified"""
        return self.email_verified and self.domain_verified


class UserFollowing(models.Model):
    """
    Track trusted/followed users for notifications about their items
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    follower = models.ForeignKey(
        UserProfile, on_delete=models.CASCADE, related_name='following'
    )
    following = models.ForeignKey(
        UserProfile, on_delete=models.CASCADE, related_name='followers'
    )

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('follower', 'following')
        indexes = [
            models.Index(fields=['follower', 'following']),
        ]

    def __str__(self):
        return f"{self.follower} follows {self.following}"
