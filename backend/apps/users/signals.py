from django.db.models.signals import post_save
from django.dispatch import receiver
from django.contrib.auth.models import User
from .models import UserProfile, UserVerification

@receiver(post_save, sender=User)
def create_user_profile(sender, instance, created, **kwargs):
    """
    Signal to automatically create a UserProfile and UserVerification
    whenever a new User is created.
    """
    if created:
        # Create profile only if it doesn't exist
        profile, profile_created = UserProfile.objects.get_or_create(
            user=instance,
            defaults={
                'full_name': f"{instance.first_name} {instance.last_name}".strip() or instance.username
            }
        )
        # Ensure verification status is also created
        if profile_created:
            UserVerification.objects.get_or_create(user_profile=profile)

@receiver(post_save, sender=User)
def save_user_profile(sender, instance, **kwargs):
    """
    Ensure UserProfile is saved when User is saved.
    """
    if hasattr(instance, 'profile'):
        instance.profile.save()
