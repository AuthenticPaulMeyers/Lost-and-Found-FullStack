"""Placeholder claims models"""

import uuid
from django.db import models


class Claim(models.Model):
    """
    Model for tracking item claims (when someone asserts ownership of a found item)
    """
    STATUS_CHOICES = [
        ('pending', 'Pending Approval'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
        ('contacted', 'Contacted/In Discussion'),
        ('resolved', 'Resolved/Returned'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    item = models.ForeignKey(
        'items.Item', 
        on_delete=models.CASCADE, 
        related_name='claims'
    )
    claimer = models.ForeignKey(
        'users.UserProfile', 
        on_delete=models.CASCADE, 
        related_name='my_claims'
    )
    
    # Verification details provided by the claimer
    verification_description = models.TextField(
        help_text="Provide specific details that prove this item is yours (e.g., lock screen wallpaper, specific dent, contents)"
    )
    
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    
    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    resolved_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-created_at']
        unique_together = ('item', 'claimer') # One claim per user per item
        verbose_name = "Item Claim"
        verbose_name_plural = "Item Claims"

    def __str__(self):
        return f"Claim by {self.claimer} for {self.item.title}"
