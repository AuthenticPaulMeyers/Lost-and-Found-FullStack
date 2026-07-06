from channels.generic.websocket import AsyncJsonWebsocketConsumer
from channels.db import database_sync_to_async
from django.shortcuts import get_object_or_404
from apps.chat.models import ChatConversation, Message
from apps.users.models import UserProfile


class ChatConsumer(AsyncJsonWebsocketConsumer):
    async def connect(self):
        self.chat_id = self.scope['url_route']['kwargs'].get('chat_id')
        self.group_name = f'chat_{self.chat_id}'

        # Accept connection only if chat exists
        try:
            self.conversation = await database_sync_to_async(lambda: ChatConversation.objects.get(id=self.chat_id))()
        except Exception:
            await self.close()
            return

        await self.channel_layer.group_add(self.group_name, self.channel_name)
        # also add this connection to a per-user group for targeted events
        try:
            profile = self.scope['user'].profile
            await self.channel_layer.group_add(f'user_{profile.id}', self.channel_name)
        except Exception:
            profile = None
        await self.accept()
        # announce presence (online) to group
        try:
            await self.channel_layer.group_send(self.group_name, {'type': 'chat.presence', 'chatId': str(self.chat_id), 'userId': str(profile.id), 'online': True})
            # find pending undelivered messages where this user is the recipient
            pending = await database_sync_to_async(lambda: list(Message.objects.filter(conversation=self.conversation, delivered=False).exclude(sender=profile).values('id', 'sender_id')))()
            for p in pending:
                mid = p.get('id')
                sender_id = p.get('sender_id')
                # mark delivered in DB
                await database_sync_to_async(lambda m_id: Message.objects.filter(id=m_id).update(delivered=True))(mid)
                # notify the original sender only via their user group
                await self.channel_layer.group_send(f'user_{sender_id}', {'type': 'chat.delivered', 'chatId': str(self.chat_id), 'messageId': str(mid), 'delivered': True})
        except Exception:
            pass

    async def disconnect(self, code):
        try:
            profile = self.scope['user'].profile
            await self.channel_layer.group_send(self.group_name, {'type': 'chat.presence', 'chatId': str(self.chat_id), 'userId': str(profile.id), 'online': False})
            # remove from per-user group
            await self.channel_layer.group_discard(f'user_{profile.id}', self.channel_name)
        except Exception:
            pass
        await self.channel_layer.group_discard(self.group_name, self.channel_name)

    async def receive_json(self, content, **kwargs):
        action = content.get('action')
        user = self.scope.get('user')
        # handle presence broadcasts from clients
        if action == 'presence':
            user_id = content.get('userId')
            online = content.get('online', True)
            await self.channel_layer.group_send(self.group_name, {'type': 'chat.presence', 'chatId': str(self.chat_id), 'userId': user_id, 'online': online})
            return
        if action == 'send':
            text = content.get('text')
            temp_id = content.get('temp_id')
            # persist message
            msg = await database_sync_to_async(self._create_message)(user, text)
            payload = {
                'type': 'chat.message',
                'message': msg.to_dict(),
                'temp_id': temp_id,
                'sender_channel': self.channel_name,
            }
            # broadcast to group
            await self.channel_layer.group_send(self.group_name, payload)
            # Immediately notify sender about delivery (optimistic)
            await self.send_json({'event': 'chat.delivered', 'chatId': str(self.chat_id), 'messageId': str(msg.id), 'temp_id': temp_id, 'delivered': msg.delivered})
        elif action == 'seen':
            message_id = content.get('messageId')
            await database_sync_to_async(self._mark_seen)(message_id)
            await self.channel_layer.group_send(self.group_name, {'type': 'chat.seen', 'chatId': str(self.chat_id), 'messageId': message_id})

    def _create_message(self, user, text):
        # user may be an AnonymousUser — attempt to resolve profile
        profile = None
        try:
            profile = user.profile
        except Exception:
            profile = UserProfile.objects.first()
        msg = Message.objects.create(conversation=self.conversation, sender=profile, text=text)
        return msg

    def _mark_delivered(self, message_id):
        try:
            msg = Message.objects.get(id=message_id)
            msg.delivered = True
            msg.save()
        except Message.DoesNotExist:
            pass

    def _mark_seen(self, message_id):
        try:
            msg = Message.objects.get(id=message_id)
            msg.seen = True
            msg.save()
        except Message.DoesNotExist:
            pass

    async def chat_message(self, event):
        # Received from group_send
        # avoid echoing the same message back to the sending connection
        if event.get('sender_channel') and event.get('sender_channel') == self.channel_name:
            return
        await self.send_json({'event': 'chat.message', 'chatId': str(self.chat_id), 'message': event.get('message'), 'temp_id': event.get('temp_id')})

    async def chat_delivered(self, event):
        # Broadcast delivered ack to group (senders will update their optimistic UI)
        await self.send_json({'event': 'chat.delivered', 'chatId': str(self.chat_id), 'messageId': event.get('messageId'), 'delivered': event.get('delivered', True)})

    async def chat_presence(self, event):
        await self.send_json({'event': 'chat.presence', 'chatId': event.get('chatId'), 'userId': event.get('userId'), 'online': event.get('online')})

    async def chat_seEN(self, event):
        # typo-safe handler if named differently
        await self.send_json({'event': 'chat.seen', 'chatId': event.get('chatId'), 'messageId': event.get('messageId')})

    async def chat_seen(self, event):
        await self.send_json({'event': 'chat.seen', 'chatId': event.get('chatId'), 'messageId': event.get('messageId')})
