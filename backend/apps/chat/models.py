"""Chat models for real-time messaging.

Note: This adds a minimal schema for ChatConversation and Message. Run
makemigrations/migrate after applying in your environment.
"""

import uuid
from django.db import models
from apps.users.models import UserProfile


class ChatConversation(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    title = models.CharField(max_length=255, blank=True)
    participants = models.ManyToManyField(UserProfile, related_name='conversations')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return self.title or f"Conversation-{self.id}"


class Message(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    conversation = models.ForeignKey(ChatConversation, on_delete=models.CASCADE, related_name='messages')
    sender = models.ForeignKey(UserProfile, on_delete=models.CASCADE, related_name='sent_messages')
    text = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    delivered = models.BooleanField(default=False)
    seen = models.BooleanField(default=False)

    class Meta:
        ordering = ['created_at']

    def to_dict(self):
        return {
            'id': str(self.id),
            'conversation': str(self.conversation.id),
            'sender_id': str(self.sender.id),
            'sender_name': self.sender.full_name or self.sender.user.username,
            'text': self.text,
            'created_at': self.created_at.isoformat(),
            'delivered': self.delivered,
            'seen': self.seen,
        }

    def __str__(self):
        return f"Message-{self.id} by {self.sender}"
