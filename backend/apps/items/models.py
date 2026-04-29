"""
Item Models for uFoundIt
Models for lost/found items
"""

import uuid
from django.db import models


class ItemCategory(models.Model):
    """Item category (Electronics, Keys, Clothing, etc.)"""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100, unique=True)
    icon = models.CharField(max_length=255, blank=True)  # icon name/code
    description = models.TextField(blank=True)

    class Meta:
        verbose_name_plural = "Item Categories"
        ordering = ['name']

    def __str__(self):
        return self.name


class Item(models.Model):
    """
    Core Item model for lost and found listings
    """
    ITEM_TYPE_CHOICES = [
        ('lost', 'Lost'),
        ('found', 'Found'),
    ]

    STATUS_CHOICES = [
        ('active', 'Active'),
        ('pending', 'Pending Claim'),
        ('claimed', 'Claimed'),
        ('returned', 'Returned/Resolved'),
        ('cancelled', 'Cancelled'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    poster = models.ForeignKey(
        'users.UserProfile', 
        on_delete=models.CASCADE, 
        related_name='posted_items'
    )
    
    # Core Information
    title = models.CharField(max_length=255)
    description = models.TextField()
    category = models.ForeignKey(
        ItemCategory, 
        on_delete=models.SET_NULL, 
        null=True, 
        related_name='items'
    )
    item_type = models.CharField(max_length=10, choices=ITEM_TYPE_CHOICES)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='active')
    
    # Location tracking
    location_name = models.CharField(
        max_length=255, 
        help_text="e.g., Near MLW Building, Library 2nd Floor"
    )
    campus_area = models.CharField(max_length=100, blank=True)
    
    # Date tracking
    date_found_lost = models.DateTimeField(
        help_text="When was the item found or lost?"
    )
    
    # Metadata
    is_anonymous = models.BooleanField(
        default=False, 
        help_text="Hide poster's identity for found items"
    )
    # Verification
    verification_question = models.TextField(
        blank=True, 
        help_text="Ask a specific question to verify the owner (e.g., 'What color is the case?')"
    )

    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['item_type', 'status']),
            models.Index(fields=['category']),
            models.Index(fields=['created_at']),
        ]

    def __str__(self):
        return f"[{self.item_type.upper()}] {self.title}"


class ItemImage(models.Model):
    """
    Images associated with an item
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    item = models.ForeignKey(Item, on_delete=models.CASCADE, related_name='images')
    image = models.ImageField(upload_to='item_images/')
    is_thumbnail = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Image for {self.item.title}"
