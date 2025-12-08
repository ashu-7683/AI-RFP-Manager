"""
Test email functionality
"""
import os
import django
import logging

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'rfp_system.settings')
django.setup()

from rfp.email_services import EmailService
from rfp.models import Vendor, RFP
from datetime import datetime, timedelta

def test_email_sending():
    print("=== Testing Email Sending ===")
    
    # Test connection
    success, message = EmailService.test_email_connection()
    print(f"Connection Test: {success} - {message}")
    
    # Create test vendor if not exists
    vendor, created = Vendor.objects.get_or_create(
        email='test@example.com',
        defaults={
            'name': 'Test Vendor',
            'contact_person': 'Test Person',
            'phone': '123-456-7890',
            'category': 'Test',
            'rating': 4.0
        }
    )
    
    # Create test RFP if not exists
    rfp, created = RFP.objects.get_or_create(
        title='Test RFP for Email',
        defaults={
            'description': 'Testing email functionality',
            'total_budget': 10000,
            'delivery_days': 30,
            'payment_terms': 'Net 30',
            'warranty': '1 year',
            'requirements': ['Test requirement 1', 'Test requirement 2'],
            'deadline': datetime.now() + timedelta(days=14),
            'status': 'draft'
        }
    )
    
    # Test sending to vendor
    print(f"\nSending RFP to {vendor.email}...")
    results = EmailService.send_rfp_to_vendors(rfp, [vendor.id])
    print(f"Results: {results}")
    
    # Test test email
    print(f"\nSending test email...")
    success, message = EmailService.send_test_email(
        'test@example.com',
        'Test Email',
        'This is a test email from the RFP system.'
    )
    print(f"Test Email: {success} - {message}")

def test_email_receiving():
    print("\n=== Testing Email Receiving ===")
    
    # Check emails (in demo mode this creates demo proposals)
    print("Checking emails...")
    new_proposals = EmailService.check_incoming_emails()
    print(f"Found {len(new_proposals)} new proposals")
    
    # Parse any unparsed proposals
    print("Parsing proposals...")
    parsed_count = EmailService.parse_new_proposals()
    print(f"Parsed {parsed_count} proposals")

if __name__ == '__main__':
    # Configure logging
    logging.basicConfig(level=logging.INFO)
    
    test_email_sending()
    test_email_receiving()
    
    print("\n=== Test Complete ===")