from django.urls import path
from . import views

urlpatterns = [
    path('', views.ChatList.as_view(), name='chat-list'),
    path('get_or_create/', views.ChatGetOrCreate.as_view(), name='chat-get-or-create'),
    path('<uuid:chat_id>/messages/', views.ChatMessages.as_view(), name='chat-messages'),
]
