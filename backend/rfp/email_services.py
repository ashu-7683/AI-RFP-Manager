import os
import smtplib
import imaplib
import email
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import ssl
from email.header import decode_header
import time
import random
from django.conf import settings
from django.core.mail import send_mail, EmailMessage
from django.core.mail.backends.smtp import EmailBackend
from .models import Vendor, RFP, Proposal, RFPSendLog
import logging

logger = logging.getLogger(__name__)

class EmailService:
    """
    Email service for sending RFPs and receiving vendor responses
    """
    
    @staticmethod
    def test_email_connection():
        """Test email configuration"""
        try:
            if settings.EMAIL_SENDING_ENABLED:
                with smtplib.SMTP(settings.EMAIL_HOST, settings.EMAIL_PORT) as server:
                    server.starttls()
                    server.login(settings.EMAIL_HOST_USER, settings.EMAIL_HOST_PASSWORD)
                    return True, "Email connection successful"
            else:
                return True, "Email sending is disabled (demo mode)"
        except Exception as e:
            return False, f"Email connection failed: {str(e)}"
    
    @staticmethod
    def send_rfp_to_vendors(rfp, vendor_ids):
        """
        Send RFP to selected vendors via email
        Returns: List of results with status for each vendor
        """
        logger.info(f"Sending RFP '{rfp.title}' to {len(vendor_ids)} vendors")
        
        vendors = Vendor.objects.filter(id__in=vendor_ids)
        results = []
        
        for vendor in vendors:
            try:
                # Create email content
                subject = f"Request for Proposal: {rfp.title}"
                
                body = f"""Dear {vendor.contact_person or vendor.name},

You are invited to submit a proposal for the following requirement:

**RFP Title:** {rfp.title}
**Description:** {rfp.description}

**Key Requirements:**
- Budget: ${rfp.total_budget}
- Delivery: Within {rfp.delivery_days} days
- Payment Terms: {rfp.payment_terms}
- Warranty: {rfp.warranty}

**Detailed Requirements:**
{chr(10).join([f"• {req}" for req in rfp.requirements])}

**Please provide in your response:**
1. Total quoted price
2. Proposed delivery timeline (in days)
3. Payment terms you propose
4. Warranty details offered
5. Compliance with each requirement (yes/no/partial with notes)

**Deadline for submission:** {rfp.deadline.strftime('%Y-%m-%d')}

Please reply directly to this email with your proposal.

We look forward to your response.

Best regards,
Procurement Team
AI-Powered RFP Management System
                """
                
                # Check if we should send real email or just simulate
                if settings.EMAIL_SENDING_ENABLED and not settings.DEMO_MODE:
                    # Send actual email
                    send_mail(
                        subject=subject,
                        message=body,
                        from_email=settings.DEFAULT_FROM_EMAIL,
                        recipient_list=[vendor.email],
                        fail_silently=False,
                    )
                    status = 'sent'
                    logger.info(f"Email sent to {vendor.email}")
                else:
                    # Demo mode - just log
                    status = 'demo_sent'
                    logger.info(f"DEMO: Would send email to {vendor.email}")
                    logger.info(f"  Subject: {subject}")
                    logger.info(f"  Body length: {len(body)} characters")
                
                # Create send log
                RFPSendLog.objects.create(
                    rfp=rfp,
                    vendor=vendor,
                    email_subject=subject,
                    email_body=body,
                    is_sent=(status == 'sent')
                )
                
                # Add vendor to RFP if not already added
                if vendor not in rfp.vendors.all():
                    rfp.vendors.add(vendor)
                
                results.append({
                    'vendor_id': vendor.id,
                    'vendor_name': vendor.name,
                    'vendor_email': vendor.email,
                    'status': status,
                    'error': None
                })
                
            except Exception as e:
                logger.error(f"Failed to send email to {vendor.email}: {str(e)}")
                results.append({
                    'vendor_id': vendor.id,
                    'vendor_name': vendor.name,
                    'vendor_email': vendor.email,
                    'status': 'failed',
                    'error': str(e)
                })
        
        # Update RFP status
        if results and any(r['status'] in ['sent', 'demo_sent'] for r in results):
            rfp.status = 'sent'
            rfp.save()
            logger.info(f"Updated RFP {rfp.id} status to 'sent'")
        
        return results
    
    @staticmethod
    def create_demo_proposal_for_vendor(rfp, vendor):
        """Create a realistic demo proposal for testing"""
        from .ai_services import AIService
        
        # Generate realistic demo data
        base_price = float(rfp.total_budget) * random.uniform(0.8, 1.2)
        delivery_days = max(5, rfp.delivery_days + random.randint(-10, 5))
        
        # Generate a realistic email response
        email_body = f"""Dear Procurement Team,

Thank you for the opportunity to submit a proposal for your RFP: {rfp.title}.

**Our Proposal:**
- Total Quoted Price: ${base_price:,.2f}
- Delivery Timeline: {delivery_days} days
- Payment Terms: Net 30 days
- Warranty Offered: 3 years comprehensive warranty
- Additional Notes: We can provide on-site installation and 24/7 support.

**Compliance with Requirements:**
1. New units with original packaging: Yes
2. On-site warranty support: Yes
3. Installation services: Yes
4. Delivery within timeframe: Yes, we commit to {delivery_days} days

We believe our proposal offers the best value and quality. Please let us know if you need any clarification.

Best regards,
{vendor.contact_person or 'Sales Team'}
{vendor.name}
{vendor.email}
        """
        
        # Use AI service to parse (in demo mode, it will return demo data)
        parsed_data = AIService.parse_vendor_response(email_body, rfp.requirements)
        
        # Create proposal
        proposal = Proposal.objects.create(
            rfp=rfp,
            vendor=vendor,
            email_subject=f"Proposal for RFP: {rfp.title}",
            email_body=email_body,
            raw_response=email_body,
            total_price=parsed_data.get('total_price', base_price),
            proposed_delivery_days=parsed_data.get('delivery_days', delivery_days),
            proposed_terms=parsed_data.get('payment_terms', 'Net 30'),
            warranty_offered=parsed_data.get('warranty', '3 years'),
            compliance_score=parsed_data.get('compliance_score', random.randint(80, 95)),
            is_parsed=True,
            parsed_data=parsed_data,
            notes=f"Demo proposal from {vendor.name}"
        )
        
        logger.info(f"Created demo proposal {proposal.id} from {vendor.name} for RFP {rfp.id}")
        return proposal
    
    @staticmethod
    def check_incoming_emails_real():
        """
        Actually check email inbox for vendor responses
        Note: This requires proper IMAP configuration
        """
        if not settings.EMAIL_RECEIVING_ENABLED:
            logger.warning("Email receiving is disabled in settings")
            return []
        
        try:
            logger.info("Checking real emails via IMAP...")
            
            # Connect to IMAP server
            mail = imaplib.IMAP4_SSL(settings.EMAIL_IMAP_HOST, settings.EMAIL_IMAP_PORT)
            mail.login(settings.EMAIL_HOST_USER, settings.EMAIL_HOST_PASSWORD)
            mail.select('inbox')
            
            # Search for unread emails
            status, messages = mail.search(None, 'UNSEEN')
            
            if status != 'OK':
                logger.error("Failed to search emails")
                return []
            
            email_ids = messages[0].split()
            new_proposals = []
            
            logger.info(f"Found {len(email_ids)} unread emails")
            
            for email_id in email_ids:
                try:
                    # Fetch the email
                    status, msg_data = mail.fetch(email_id, '(RFC822)')
                    
                    if status != 'OK':
                        continue
                    
                    # Parse email
                    raw_email = msg_data[0][1]
                    msg = email.message_from_bytes(raw_email)
                    
                    # Decode subject
                    subject, encoding = decode_header(msg['subject'])[0]
                    if isinstance(subject, bytes):
                        subject = subject.decode(encoding if encoding else 'utf-8')
                    
                    # Get sender email
                    from_header = msg.get('from', '')
                    sender_name, sender_email = email.utils.parseaddr(from_header)
                    
                    # Extract email body
                    body = ""
                    if msg.is_multipart():
                        for part in msg.walk():
                            content_type = part.get_content_type()
                            content_disposition = str(part.get("Content-Disposition"))
                            
                            # Get plain text body
                            if content_type == "text/plain" and "attachment" not in content_disposition:
                                try:
                                    body = part.get_payload(decode=True).decode()
                                except:
                                    body = part.get_payload(decode=True).decode('latin-1')
                                break
                    else:
                        # Not multipart
                        try:
                            body = msg.get_payload(decode=True).decode()
                        except:
                            body = msg.get_payload(decode=True).decode('latin-1')
                    
                    logger.info(f"Processing email from {sender_email}: {subject[:50]}...")
                    
                    # Find vendor by email
                    vendor = Vendor.objects.filter(email=sender_email).first()
                    if not vendor:
                        logger.info(f"No vendor found with email: {sender_email}")
                        continue
                    
                    # Try to find matching RFP by subject
                    rfp = None
                    active_rfps = RFP.objects.filter(status='sent', vendors=vendor)
                    
                    for active_rfp in active_rfps:
                        if active_rfp.title.lower() in subject.lower() or 'RFP' in subject.upper() or 'proposal' in subject.lower():
                            rfp = active_rfp
                            break
                    
                    if not rfp and active_rfps.exists():
                        # Use the most recent RFP sent to this vendor
                        rfp = active_rfps.order_by('-created_at').first()
                    
                    if rfp:
                        # Create proposal record
                        proposal = Proposal.objects.create(
                            rfp=rfp,
                            vendor=vendor,
                            email_subject=subject,
                            email_body=body,
                            raw_response=body,
                            is_parsed=False
                        )
                        
                        # Mark email as read
                        mail.store(email_id, '+FLAGS', '\\Seen')
                        
                        new_proposals.append(proposal.id)
                        logger.info(f"Created proposal {proposal.id} from email")
                    
                except Exception as e:
                    logger.error(f"Error processing email {email_id}: {str(e)}")
                    continue
            
            # Close connection
            mail.close()
            mail.logout()
            
            logger.info(f"Found {len(new_proposals)} new proposals")
            return new_proposals
            
        except Exception as e:
            logger.error(f"IMAP error: {str(e)}")
            return []
    
    @staticmethod
    def check_incoming_emails_demo():
        """
        Create demo proposals for testing (used when real email checking is disabled)
        """
        logger.info("Checking emails in DEMO mode")
        
        # Get all RFPs that have been sent but don't have proposals yet
        sent_rfps = RFP.objects.filter(status='sent')
        new_proposals = []
        
        for rfp in sent_rfps:
            # Get vendors for this RFP that don't have proposals yet
            vendors_with_proposals = Proposal.objects.filter(rfp=rfp).values_list('vendor_id', flat=True)
            vendors_needing_proposals = rfp.vendors.exclude(id__in=vendors_with_proposals)
            
            # Create demo proposals for up to 2 vendors per RFP
            for vendor in vendors_needing_proposals[:2]:
                try:
                    proposal = EmailService.create_demo_proposal_for_vendor(rfp, vendor)
                    new_proposals.append(proposal.id)
                    logger.info(f"Created demo proposal for vendor {vendor.name}")
                except Exception as e:
                    logger.error(f"Failed to create demo proposal: {str(e)}")
        
        logger.info(f"Created {len(new_proposals)} demo proposals")
        return new_proposals
    
    @staticmethod
    def check_incoming_emails():
        """
        Main method to check incoming emails
        Uses real checking if enabled, otherwise demo mode
        """
        if settings.EMAIL_RECEIVING_ENABLED and not settings.DEMO_MODE:
            return EmailService.check_incoming_emails_real()
        else:
            return EmailService.check_incoming_emails_demo()
    
    @staticmethod
    def parse_new_proposals():
        """
        Parse any unparsed proposals using AI
        """
        from .ai_services import AIService
        
        unparsed_proposals = Proposal.objects.filter(is_parsed=False)
        parsed_count = 0
        
        logger.info(f"Found {unparsed_proposals.count()} unparsed proposals")
        
        for proposal in unparsed_proposals:
            try:
                # Parse the proposal using AI
                parsed_data = AIService.parse_vendor_response(
                    proposal.raw_response,
                    proposal.rfp.requirements
                )
                
                # Update proposal with parsed data
                proposal.total_price = parsed_data.get('total_price')
                proposal.proposed_delivery_days = parsed_data.get('delivery_days')
                proposal.proposed_terms = parsed_data.get('payment_terms')
                proposal.warranty_offered = parsed_data.get('warranty')
                proposal.compliance_score = parsed_data.get('compliance_score', 0)
                proposal.parsed_data = parsed_data
                proposal.is_parsed = True
                proposal.save()
                
                parsed_count += 1
                logger.info(f"Parsed proposal {proposal.id} from {proposal.vendor.name}")
                
            except Exception as e:
                logger.error(f"Failed to parse proposal {proposal.id}: {str(e)}")
        
        return parsed_count
    
    @staticmethod
    def send_test_email(to_email, subject, body):
        """
        Send a test email to verify configuration
        """
        try:
            if settings.EMAIL_SENDING_ENABLED and not settings.DEMO_MODE:
                # Send real test email
                send_mail(
                    subject=subject,
                    message=body,
                    from_email=settings.DEFAULT_FROM_EMAIL,
                    recipient_list=[to_email],
                    fail_silently=False,
                )
                return True, f"Test email sent to {to_email}"
            else:
                # Demo mode
                logger.info(f"DEMO: Test email would be sent to {to_email}")
                logger.info(f"  Subject: {subject}")
                logger.info(f"  Body: {body}")
                return True, f"DEMO: Test email would be sent to {to_email} (email sending is disabled)"
                
        except Exception as e:
            logger.error(f"Failed to send test email: {str(e)}")
            return False, str(e)