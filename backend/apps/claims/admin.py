from django.contrib import admin
from .models import Claim


@admin.register(Claim)
class ClaimAdmin(admin.ModelAdmin):
    list_display = ['id', 'created_at']
    readonly_fields = ['id', 'created_at']
