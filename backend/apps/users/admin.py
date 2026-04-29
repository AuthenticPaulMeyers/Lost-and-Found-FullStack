from django.contrib import admin
from django.contrib.auth.models import User
from .models import UserProfile, UserVerification, UserFollowing


@admin.register(UserProfile)
class UserProfileAdmin(admin.ModelAdmin):
    list_display = [
        'full_name', 'user', 'is_verified', 'total_successful_claims',
        'verification_badge_eligible', 'created_at'
    ]
    list_filter = ['is_verified', 'verification_badge_eligible', 'created_at']
    search_fields = ['full_name', 'user__username', 'university_email']
    readonly_fields = ['id', 'created_at', 'updated_at', 'last_active']
    fieldsets = (
        ('User Info', {
            'fields': ('id', 'user', 'full_name', 'phone_number')
        }),
        ('Contact', {
            'fields': ('university_email', 'campus_location')
        }),
        ('Verification & Reputation', {
            'fields': (
                'is_verified', 'verification_date', 'verification_badge_eligible',
                'reputation_score'
            )
        }),
        ('Statistics', {
            'fields': (
                'total_items_found', 'total_items_lost', 'total_successful_claims'
            )
        }),
        ('Media & Bio', {
            'fields': ('profile_picture', 'bio')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at', 'last_active'),
            'classes': ('collapse',)
        }),
    )


@admin.register(UserVerification)
class UserVerificationAdmin(admin.ModelAdmin):
    list_display = [
        'user_profile', 'email_verified', 'domain_verified',
        'phone_verified', 'get_verification_percentage'
    ]
    list_filter = ['email_verified', 'domain_verified', 'phone_verified']
    search_fields = ['user_profile__full_name', 'user_profile__user__username']
    readonly_fields = ['id', 'created_at', 'updated_at', 'get_verification_percentage']
    fieldsets = (
        ('User', {
            'fields': ('id', 'user_profile')
        }),
        ('Email Verification', {
            'fields': (
                'email_verified', 'email_verification_token',
                'email_verification_sent_at', 'email_verified_at'
            )
        }),
        ('University Domain Verification', {
            'fields': (
                'university_domain', 'domain_verified',
                'domain_verification_status'
            )
        }),
        ('Phone Verification', {
            'fields': (
                'phone_verified', 'phone_verification_code',
                'phone_verified_at'
            )
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at', 'get_verification_percentage'),
            'classes': ('collapse',)
        }),
    )


@admin.register(UserFollowing)
class UserFollowingAdmin(admin.ModelAdmin):
    list_display = ['follower', 'following', 'created_at']
    search_fields = ['follower__full_name', 'following__full_name']
    readonly_fields = ['id', 'created_at']
