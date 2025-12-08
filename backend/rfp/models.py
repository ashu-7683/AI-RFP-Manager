from django.db import models
import json

class Vendor(models.Model):
    name = models.CharField(max_length=200)
    email = models.EmailField(unique=True)
    contact_person = models.CharField(max_length=100, blank=True)
    phone = models.CharField(max_length=10, blank=True)  
    category = models.CharField(max_length=100, default='General')
    rating = models.FloatField(default=0.0)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['name']

    def __str__(self):
        return f"{self.name} ({self.email})"

class RFP(models.Model):
    STATUS_CHOICES = [
        ('draft', 'Draft'),
        ('sent', 'Sent to Vendors'),
        ('review', 'Under Review'),
        ('completed', 'Completed'),
        ('cancelled', 'Cancelled'),
    ]

    title = models.CharField(max_length=200)
    description = models.TextField()
    natural_language_input = models.TextField(blank=True)
    structured_data = models.JSONField(default=dict)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='draft')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    deadline = models.DateTimeField()
    
    total_budget = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    delivery_days = models.IntegerField(default=30)
    payment_terms = models.TextField(blank=True)
    warranty = models.TextField(blank=True)
    requirements = models.JSONField(default=list)
    
    # Fixed relationship
    vendors = models.ManyToManyField(Vendor, through='RFPSendLog', related_name='rfps')

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.title} - {self.get_status_display()}"
    
    def get_status_display(self):
        return dict(self.STATUS_CHOICES).get(self.status, self.status)
    
    @property
    def vendor_count(self):
        return self.vendors.count()
    
    def to_dict(self):
        return {
            'id': self.id,
            'title': self.title,
            'description': self.description,
            'status': self.status,
            'status_display': self.get_status_display(),
            'created_at': self.created_at.isoformat(),
            'deadline': self.deadline.isoformat(),
            'total_budget': float(self.total_budget),
            'delivery_days': self.delivery_days,
            'payment_terms': self.payment_terms,
            'warranty': self.warranty,
            'requirements': self.requirements,
            'vendor_count': self.vendor_count,
        }

class RFPSendLog(models.Model):
    rfp = models.ForeignKey(RFP, on_delete=models.CASCADE)
    vendor = models.ForeignKey(Vendor, on_delete=models.CASCADE)
    sent_at = models.DateTimeField(auto_now_add=True)
    email_subject = models.CharField(max_length=300)
    email_body = models.TextField()
    is_sent = models.BooleanField(default=False)
    sent_error = models.TextField(blank=True)

    class Meta:
        unique_together = ['rfp', 'vendor']

class Proposal(models.Model):
    rfp = models.ForeignKey(RFP, on_delete=models.CASCADE, related_name='proposals')
    vendor = models.ForeignKey(Vendor, on_delete=models.CASCADE)
    
    email_subject = models.CharField(max_length=300)
    email_body = models.TextField()
    raw_response = models.TextField()
    attachments = models.JSONField(default=list)
    received_at = models.DateTimeField(auto_now_add=True)
    
    parsed_data = models.JSONField(default=dict)
    total_price = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    proposed_delivery_days = models.IntegerField(null=True, blank=True)
    proposed_terms = models.TextField(blank=True)
    warranty_offered = models.TextField(blank=True)
    compliance_score = models.FloatField(default=0.0)
    is_parsed = models.BooleanField(default=False)
    
    notes = models.TextField(blank=True)
    is_preferred = models.BooleanField(default=False)

    class Meta:
        ordering = ['-compliance_score', 'total_price']
        unique_together = ['rfp', 'vendor']

    def __str__(self):
        return f"{self.vendor.name} - {self.rfp.title}"

class Comparison(models.Model):
    rfp = models.OneToOneField(RFP, on_delete=models.CASCADE, related_name='comparison')
    created_at = models.DateTimeField(auto_now_add=True)
    ai_recommendation = models.JSONField(default=dict)
    summary = models.TextField(blank=True)
    
    proposals = models.ManyToManyField(Proposal)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Comparison for {self.rfp.title}"