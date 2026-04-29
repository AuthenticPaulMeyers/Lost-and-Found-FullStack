from django.contrib import admin
from .models import ItemCategory, Item, ItemImage


@admin.register(ItemCategory)
class ItemCategoryAdmin(admin.ModelAdmin):
    list_display = ['name', 'icon']
    search_fields = ['name', 'description']
    readonly_fields = ['id']


class ItemImageInline(admin.TabularInline):
    model = ItemImage
    extra = 1


@admin.register(Item)
class ItemAdmin(admin.ModelAdmin):
    list_display = [
        'title', 'item_type', 'status', 'poster', 
        'category', 'location_name', 'created_at'
    ]
    list_filter = ['item_type', 'status', 'category', 'created_at']
    search_fields = ['title', 'description', 'location_name']
    readonly_fields = ['id', 'created_at', 'updated_at']
    inlines = [ItemImageInline]
    
    fieldsets = (
        ('Basic Info', {
            'fields': ('id', 'poster', 'title', 'description', 'category')
        }),
        ('Classification', {
            'fields': ('item_type', 'status', 'is_anonymous')
        }),
        ('Location & Time', {
            'fields': ('location_name', 'campus_area', 'date_found_lost')
        }),
        ('Metadata', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )


@admin.register(ItemImage)
class ItemImageAdmin(admin.ModelAdmin):
    list_display = ['item', 'is_thumbnail', 'created_at']
    list_filter = ['is_thumbnail', 'created_at']
    readonly_fields = ['id', 'created_at']
