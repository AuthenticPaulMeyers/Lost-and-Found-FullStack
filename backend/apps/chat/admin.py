from django.contrib import admin
from .models import ChatConversation, Message


@admin.register(ChatConversation)
class ChatConversationAdmin(admin.ModelAdmin):
    list_display = ['id', 'created_at']
    readonly_fields = ['id', 'created_at']


@admin.register(Message)
class MessageAdmin(admin.ModelAdmin):
    list_display = ['id', 'created_at']
    readonly_fields = ['id', 'created_at']
