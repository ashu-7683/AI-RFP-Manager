from django.contrib import admin
from .models import Vendor, RFP, Proposal, Comparison, RFPSendLog

@admin.register(Vendor)
class VendorAdmin(admin.ModelAdmin):
    list_display = ['name', 'email', 'category', 'rating', 'is_active']
    search_fields = ['name', 'email']
    list_filter = ['category', 'is_active']

@admin.register(RFP)
class RFPAdmin(admin.ModelAdmin):
    list_display = ['title', 'status', 'total_budget', 'deadline', 'created_at']
    list_filter = ['status']
    search_fields = ['title', 'description']
    # REMOVED: filter_horizontal = ['vendors'] because it has a through model

@admin.register(Proposal)
class ProposalAdmin(admin.ModelAdmin):
    list_display = ['vendor', 'rfp', 'total_price', 'compliance_score', 'is_parsed', 'received_at']
    list_filter = ['is_parsed', 'is_preferred']
    search_fields = ['vendor__name', 'rfp__title']

@admin.register(Comparison)
class ComparisonAdmin(admin.ModelAdmin):
    list_display = ['rfp', 'created_at']
    filter_horizontal = ['proposals']

@admin.register(RFPSendLog)
class RFPSendLogAdmin(admin.ModelAdmin):
    list_display = ['rfp', 'vendor', 'sent_at', 'is_sent']
    list_filter = ['is_sent']
    readonly_fields = ['sent_at']