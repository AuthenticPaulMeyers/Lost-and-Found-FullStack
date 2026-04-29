from rest_framework import serializers
from .models import Item, ItemCategory, ItemImage
from apps.users.serializers import UserProfileSerializer

class ItemCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = ItemCategory
        fields = '__all__'

class ItemImageSerializer(serializers.ModelSerializer):
    image_url = serializers.SerializerMethodField()

    class Meta:
        model = ItemImage
        fields = ['id', 'image', 'image_url', 'is_thumbnail']

    def get_image_url(self, obj):
        if obj.image:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.image.url)
            return obj.image.url
        return None

class ItemListSerializer(serializers.ModelSerializer):
    """Simplified serializer for dashboard listing"""
    category = ItemCategorySerializer(read_only=True)
    thumbnail = serializers.SerializerMethodField()
    poster_name = serializers.SerializerMethodField()

    class Meta:
        model = Item
        fields = [
            'id', 'title', 'item_type', 'status', 'category', 
            'location_name', 'date_found_lost', 'thumbnail', 
            'poster_name', 'verification_question', 'created_at'
        ]

    def get_thumbnail(self, obj):
        thumb = obj.images.filter(is_thumbnail=True).first() or obj.images.first()
        if thumb:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(thumb.image.url)
            return thumb.image.url
        return None

    def get_poster_name(self, obj):
        if obj.is_anonymous and obj.item_type == 'found':
            return "Anonymous Finder"
        return obj.poster.full_name or obj.poster.user.username

class ItemDetailSerializer(serializers.ModelSerializer):
    """Full detail serializer for item view"""
    category_name = serializers.ReadOnlyField(source='category.name')
    images = ItemImageSerializer(many=True, read_only=True)
    poster = UserProfileSerializer(read_only=True)
    uploaded_images = serializers.ListField(
        child=serializers.ImageField(max_length=1000000, allow_empty_file=False, use_url=False),
        write_only=True,
        required=False
    )

    class Meta:
        model = Item
        fields = [
            'id', 'poster', 'title', 'description', 'category', 'category_name',
            'item_type', 'status', 'location_name', 'campus_area', 
            'date_found_lost', 'is_anonymous', 'verification_question', 'images', 'uploaded_images',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'poster', 'created_at', 'updated_at', 'status']

    def validate(self, attrs):
        """
        Force verification question for found items.
        """
        item_type = attrs.get('item_type')
        if item_type is None and self.instance:
            item_type = self.instance.item_type

        # Get the question from attrs, or fall back to instance if not in attrs
        question = attrs.get('verification_question')
        if question is None and self.instance:
            question = self.instance.verification_question

        if item_type == 'found' and (not question or not str(question).strip()):
            raise serializers.ValidationError({
                'verification_question': 'A verification question is required for found items.'
            })
        return attrs

    def validate_uploaded_images(self, images):
        """
        Validate image sizes to prevent large file uploads.
        """
        MAX_SIZE = 5 * 1024 * 1024  # 5 MB
        for image in images:
            if image.size > MAX_SIZE:
                raise serializers.ValidationError(f"Image '{image.name}' is too large. Maximum size is 5 MB.")
        return images

    def create(self, validated_data):
        uploaded_images = validated_data.pop('uploaded_images', [])
        item = Item.objects.create(**validated_data)
        
        for index, image_data in enumerate(uploaded_images):
            # First image is thumbnail by default
            is_thumbnail = (index == 0)
            ItemImage.objects.create(item=item, image=image_data, is_thumbnail=is_thumbnail)
            
        return item
