from rest_framework import serializers
from .models import Claim
from apps.items.serializers import ItemListSerializer
from apps.users.serializers import UserProfileSerializer

class ClaimSerializer(serializers.ModelSerializer):
    claimer = UserProfileSerializer(read_only=True)
    item_details = ItemListSerializer(source='item', read_only=True)

    class Meta:
        model = Claim
        fields = [
            'id', 'item', 'item_details', 'claimer', 
            'verification_description', 'status', 
            'created_at', 'updated_at', 'resolved_at'
        ]
        read_only_fields = ['id', 'claimer', 'status', 'created_at', 'updated_at', 'resolved_at']

    def validate_item(self, value):
        if value.item_type != 'found':
            raise serializers.ValidationError("You can only claim found items.")
        if value.status != 'active':
            raise serializers.ValidationError("This item is no longer available for claiming.")
        return value
