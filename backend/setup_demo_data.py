import os
import django
from datetime import datetime, timedelta

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'rfp_system.settings')
django.setup()

from rfp.models import Vendor, RFP

def setup_demo_data():
    print("Setting up demo data...")
    
    # Create demo vendors
    vendors = [
        {
            'name': 'Tech Solutions Inc.',
            'email': 'tech@example.com',
            'contact_person': 'John Smith',
            'phone': '+1-555-1234',
            'category': 'IT',
            'rating': 4.5
        },
        {
            'name': 'Office Supplies Co.',
            'email': 'office@example.com',
            'contact_person': 'Jane Doe',
            'phone': '+1-555-5678',
            'category': 'Office',
            'rating': 4.2
        },
        {
            'name': 'Global Electronics',
            'email': 'electronics@example.com',
            'contact_person': 'Mike Johnson',
            'phone': '+1-555-9012',
            'category': 'IT',
            'rating': 4.7
        }
    ]
    
    for vendor_data in vendors:
        Vendor.objects.get_or_create(
            email=vendor_data['email'],
            defaults=vendor_data
        )
    
    print(f"Created {Vendor.objects.count()} vendors")
    
    # Create a demo RFP if none exist
    if RFP.objects.count() == 0:
        demo_rfp = RFP.objects.create(
            title='Office Equipment Purchase - Demo',
            description='Purchase laptops and monitors for new office setup',
            total_budget=50000,
            delivery_days=30,
            payment_terms='Net 30',
            warranty='3 years',
            requirements=[
                'New units with original packaging',
                'On-site warranty support',
                'Delivery within 30 days',
                'Installation services included'
            ],
            deadline=datetime.now() + timedelta(days=14),
            status='draft'
        )
        print(f"Created demo RFP: {demo_rfp.title}")
    
    print("Demo data setup complete!")

if __name__ == '__main__':
    setup_demo_data()