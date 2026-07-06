"""
WebSocket routing for chat
Full implementation in Phase 4
"""

from django.urls import path
from . import consumers

websocket_urlpatterns = [
    path('ws/chat/<uuid:chat_id>/', consumers.ChatConsumer.as_asgi()),
]
