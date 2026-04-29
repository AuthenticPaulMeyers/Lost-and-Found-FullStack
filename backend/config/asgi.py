"""
ASGI config for uFoundIt project.
It exposes the ASGI callable as a module-level variable named ``application``.
For more information on this file, see
https://docs.djangoproject.com/en/stable/howto/deployment/asgi/
"""

import os
from django.core.asgi import get_asgi_application
from channels.routing import ProtocolTypeRouter, URLRouter
from channels.auth import AuthMiddlewareStack

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')

# Initialize Django ASGI application early to ensure the AppRegistry
# is populated before importing code that may import ORM models.
django_asgi_app = get_asgi_application()

from apps.chat import routing as chat_routing
from apps.notifications import routing as notifications_routing

application = ProtocolTypeRouter({
    # Django's ASGI application to handle traditional HTTP requests
    'http': django_asgi_app,

    # WebSocket chat handler
    'websocket': AuthMiddlewareStack(
        URLRouter([
            *chat_routing.websocket_urlpatterns,
            *notifications_routing.websocket_urlpatterns,
        ])
    ),
})
