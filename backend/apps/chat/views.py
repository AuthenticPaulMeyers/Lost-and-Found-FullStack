from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from apps.users.models import UserProfile
from .models import ChatConversation, Message


class ChatGetOrCreate(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        other_user_id = request.data.get('user_id') or request.query_params.get('user')
        item_id = request.data.get('item_id') or request.query_params.get('item')
        if not other_user_id:
            return Response({'detail': 'user_id is required'}, status=400)

        try:
            other = UserProfile.objects.get(id=other_user_id)
        except UserProfile.DoesNotExist:
            return Response({'detail': 'user not found'}, status=404)

        me = request.user.profile

        # Try to find existing conversation that contains both participants
        conv = ChatConversation.objects.filter(participants=me).filter(participants=other).distinct().first()
        if not conv:
            conv = ChatConversation.objects.create(title=f"Chat: {me.user.username} / {other.user.username}")
            conv.participants.add(me, other)

        messages = [m.to_dict() for m in conv.messages.all().order_by('created_at')]
        # build other participant info
        other_participant = other
        other_info = {
            'id': str(other_participant.id),
            'name': other_participant.full_name or other_participant.user.username,
            'avatar': getattr(other_participant, 'profile_picture_url', None) or '',
        }
        return Response({'chatId': str(conv.id), 'messages': messages, 'other': other_info})


class ChatList(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        profile = request.user.profile
        convs = ChatConversation.objects.filter(participants=profile).order_by('-created_at')
        out = []
        for c in convs:
            last = c.messages.order_by('-created_at').first()
            # determine the other participant
            others = c.participants.exclude(id=profile.id)
            other_info = None
            if others.exists():
                other = others.first()
                other_info = {'id': str(other.id), 'name': other.full_name or other.user.username, 'avatar': getattr(other, 'profile_picture_url', '')}

            out.append({
                'id': str(c.id),
                'title': c.title or (other_info['name'] if other_info else ''),
                'subtitle': '',
                'icon': 'chat_bubble',
                'other': other_info,
                'last_message': last.text if last else '',
                'last_time': last.created_at.isoformat() if last else None,
                'unread': Message.objects.filter(conversation=c, seen=False).exclude(sender=profile).count(),
            })
        return Response(out)


class ChatMessages(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, chat_id):
        conv = get_object_or_404(ChatConversation, id=chat_id)
        if request.user.profile not in conv.participants.all():
            return Response({'detail': 'forbidden'}, status=403)
        messages = [m.to_dict() for m in conv.messages.all().order_by('created_at')]
        return Response(messages)
