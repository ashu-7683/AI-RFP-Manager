from rest_framework import serializers
from .models import Vendor, RFP, Proposal, Comparison

class VendorSerializer(serializers.ModelSerializer):
    class Meta:
        model = Vendor
        fields = '__all__'
    
    def validate_email(self, value):
        if '@' not in value or '.' not in value.split('@')[-1]:
            raise serializers.ValidationError("Enter a valid email address")
        return value


class RFPSerializer(serializers.ModelSerializer):
    vendor_count = serializers.SerializerMethodField()
    status_display = serializers.SerializerMethodField()
    
    class Meta:
        model = RFP
        fields = '__all__'
        read_only_fields = ['created_at', 'updated_at', 'structured_data']
    
    def get_vendor_count(self, obj):
        # Use the correct way to count vendors
        return obj.vendors.count() if hasattr(obj, 'vendors') else 0
    
    def get_status_display(self, obj):
        return obj.get_status_display()
    
    def to_representation(self, instance):
        representation = super().to_representation(instance)
        
        # Ensure vendor_count is included even if it's 0
        if 'vendor_count' not in representation:
            representation['vendor_count'] = instance.vendors.count()
        
        # Format datetime fields
        representation['created_at'] = instance.created_at.isoformat()
        representation['updated_at'] = instance.updated_at.isoformat()
        if instance.deadline:
            representation['deadline'] = instance.deadline.isoformat()
        
        # Ensure requirements is always a list
        if not isinstance(representation.get('requirements'), list):
            representation['requirements'] = []
        
        return representation
    
    
class ProposalSerializer(serializers.ModelSerializer):
    vendor_name = serializers.CharField(source='vendor.name', read_only=True)
    vendor_email = serializers.CharField(source='vendor.email', read_only=True)
    rfp_title = serializers.CharField(source='rfp.title', read_only=True)
    
    class Meta:
        model = Proposal
        fields = '__all__'
        read_only_fields = ['received_at', 'is_parsed']
    
    def to_representation(self, instance):
        representation = super().to_representation(instance)
        representation['received_at'] = instance.received_at.isoformat()
        
        # Format price
        if representation['total_price']:
            representation['total_price'] = float(representation['total_price'])
        
        return representation


class ComparisonSerializer(serializers.ModelSerializer):
    rfp_title = serializers.CharField(source='rfp.title', read_only=True)
    proposal_details = serializers.SerializerMethodField()
    
    class Meta:
        model = Comparison
        fields = '__all__'
    
    def get_proposal_details(self, obj):
        proposals = obj.proposals.all()
        return ProposalSerializer(proposals, many=True).data