"""Placeholder chat models"""

import uuid
from django.db import models


class ChatConversation(models.Model):
    """Placeholder - full implementation in Phase 4"""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Conversation-{self.id}"


class Message(models.Model):
    """Placeholder - full implementation in Phase 4"""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Message-{self.id}"
