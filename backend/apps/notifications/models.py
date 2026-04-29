"""Placeholder notification models"""

import uuid
from django.db import models


class Notification(models.Model):
    """Placeholder - full implementation in Phase 5"""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Notification-{self.id}"
