from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.shortcuts import get_object_or_404
from datetime import datetime, timedelta
import json
import logging
from django.http import JsonResponse
from django.conf import settings

from .models import Vendor, RFP, Proposal, Comparison, RFPSendLog
from .serializers import VendorSerializer, RFPSerializer, ProposalSerializer, ComparisonSerializer
from .ai_services import AIService
from .email_services import EmailService

logger = logging.getLogger(__name__)

# Add debug_status function at the module level
def debug_status(request):
    """Debug endpoint to check system status"""
    try:
        data = {
            'status': 'ok',
            'vendors_count': Vendor.objects.count(),
            'rfps_count': RFP.objects.count(),
            'proposals_count': Proposal.objects.count(),
            'comparisons_count': Comparison.objects.count(),
            'vendors': list(Vendor.objects.values('id', 'name', 'email')[:5]),
            'rfps': list(RFP.objects.values('id', 'title', 'status')[:5]),
            'timestamp': datetime.now().isoformat()
        }
        return JsonResponse(data)
    except Exception as e:
        return JsonResponse({'error': str(e), 'status': 'error'})

class VendorListCreateView(APIView):
    def get(self, request):
        vendors = Vendor.objects.all()
        serializer = VendorSerializer(vendors, many=True)
        return Response(serializer.data)
    
    def post(self, request):
        serializer = VendorSerializer(data=request.data)
        if serializer.is_valid():
            vendor = serializer.save()
            logger.info(f"Vendor created: {vendor.name} ({vendor.email})")
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class VendorDetailView(APIView):
    def get(self, request, pk):
        vendor = get_object_or_404(Vendor, pk=pk)
        serializer = VendorSerializer(vendor)
        return Response(serializer.data)
    
    def put(self, request, pk):
        vendor = get_object_or_404(Vendor, pk=pk)
        serializer = VendorSerializer(vendor, data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    def delete(self, request, pk):
        vendor = get_object_or_404(Vendor, pk=pk)
        vendor.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

class RFPListCreateView(APIView):
    def get(self, request):
        rfps = RFP.objects.all().order_by('-created_at')
        serializer = RFPSerializer(rfps, many=True)
        return Response(serializer.data)
    
    def post(self, request):
        logger.info(f"RFP Creation Request: {request.data}")
        logger.info(f"Request data keys: {list(request.data.keys())}")
        
        try:
            # Handle both AI and manual RFP creation
            rfp_data = request.data.copy()
            
            # Debug: Log all data
            for key, value in rfp_data.items():
                if key == 'requirements' and isinstance(value, list):
                    logger.info(f"{key}: {value}")
                elif key == 'structured_data':
                    logger.info(f"{key}: (JSON data)")
                else:
                    logger.info(f"{key}: {value}")
            
            # Set default deadline if not provided
            if 'deadline' not in rfp_data:
                rfp_data['deadline'] = (datetime.now() + timedelta(days=14)).isoformat()
            
            # If AI creation
            if 'natural_language' in rfp_data or 'structured_data' in rfp_data:
                user_input = rfp_data.get('natural_language', '')
                structured_data = rfp_data.get('structured_data', {})
                
                # If we have structured_data, use it, otherwise parse from natural language
                if structured_data and isinstance(structured_data, dict):
                    # Merge AI data with form data
                    rfp_data.update({
                        'title': structured_data.get('title', f"RFP - {datetime.now().strftime('%Y-%m-%d')}"),
                        'description': structured_data.get('description', user_input),
                        'total_budget': structured_data.get('total_budget', 0),
                        'delivery_days': structured_data.get('delivery_days', 30),
                        'payment_terms': structured_data.get('payment_terms', 'Net 30'),
                        'warranty': structured_data.get('warranty', '1 year'),
                        'requirements': structured_data.get('requirements', []),
                        'structured_data': structured_data,
                        'natural_language_input': user_input
                    })
                elif user_input:
                    # Parse from natural language
                    structured_data = AIService.parse_natural_language_to_rfp(user_input)
                    
                    # Merge AI data with form data
                    rfp_data.update({
                        'title': structured_data.get('title', 'New RFP'),
                        'description': structured_data.get('description', user_input),
                        'total_budget': structured_data.get('total_budget', 0),
                        'delivery_days': structured_data.get('delivery_days', 30),
                        'payment_terms': structured_data.get('payment_terms', 'Net 30'),
                        'warranty': structured_data.get('warranty', '1 year'),
                        'requirements': structured_data.get('requirements', []),
                        'structured_data': structured_data,
                        'natural_language_input': user_input
                    })
            
            logger.info(f"Final RFP data for serializer: {rfp_data}")
            
            serializer = RFPSerializer(data=rfp_data)
            
            if serializer.is_valid():
                rfp = serializer.save()
                logger.info(f"RFP created successfully: {rfp.title} (ID: {rfp.id})")
                
                response_data = serializer.data
                response_data['message'] = 'RFP created successfully'
                response_data['vendor_count'] = rfp.vendor_count
                
                return Response(response_data, status=status.HTTP_201_CREATED)
            else:
                logger.error(f"RFP validation errors: {serializer.errors}")
                return Response({
                    'error': 'Validation failed',
                    'details': serializer.errors
                }, status=status.HTTP_400_BAD_REQUEST)
                
        except Exception as e:
            logger.error(f"RFP creation error: {str(e)}", exc_info=True)
            return Response({
                'error': 'Failed to create RFP',
                'details': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            
        
class RFPDetailView(APIView):
    def get(self, request, pk):
        rfp = get_object_or_404(RFP, pk=pk)
        serializer = RFPSerializer(rfp)
        return Response(serializer.data)

class ParseNaturalLanguageView(APIView):
    def post(self, request):
        user_input = request.data.get('text', '')
        if not user_input:
            return Response({'error': 'No text provided'}, status=status.HTTP_400_BAD_REQUEST)
        
        structured_data = AIService.parse_natural_language_to_rfp(user_input)
        return Response(structured_data)

class SendRFPView(APIView):
    def post(self, request, pk):
        try:
            rfp = get_object_or_404(RFP, pk=pk)
            vendor_ids = request.data.get('vendor_ids', [])
            
            if not vendor_ids:
                return Response({'error': 'No vendors selected'}, status=status.HTTP_400_BAD_REQUEST)
            
            # Validate vendors exist
            vendors = Vendor.objects.filter(id__in=vendor_ids)
            if vendors.count() != len(vendor_ids):
                return Response({'error': 'Some vendors not found'}, status=status.HTTP_400_BAD_REQUEST)
            
            # Send RFP to vendors
            send_results = EmailService.send_rfp_to_vendors(rfp, vendor_ids)
            
            # Count successful sends
            successful_sends = sum(1 for r in send_results if r.get('status') in ['sent', 'demo_sent'])
            
            # Check if any failed
            failed_sends = [r for r in send_results if r.get('status') == 'failed']
            
            # Create response message based on mode
            if settings.DEMO_MODE:
                message = f'✅ DEMO MODE: RFP "{rfp.title}" has been sent to {successful_sends} vendor(s).\n\n'
                message += f'Vendors contacted:\n'
                for result in send_results:
                    if result.get('status') == 'demo_sent':
                        message += f"• {result.get('vendor_name')} ({result.get('vendor_email')})\n"
            else:
                message = f'✅ RFP "{rfp.title}" has been successfully sent to {successful_sends} vendor(s).'
                if failed_sends:
                    message += f"\n\n⚠️ Failed to send to {len(failed_sends)} vendor(s):"
                    for fail in failed_sends:
                        message += f"\n• {fail.get('vendor_name')}: {fail.get('error', 'Unknown error')}"
            
            # Create demo proposals if in demo mode
            if settings.DEMO_MODE:
                # Wait a bit to simulate email sending
                import time
                time.sleep(1)
                
                # Create demo proposals
                created_count = 0
                for vendor in vendors[:2]:  # Create demo proposals for first 2 vendors
                    try:
                        proposal = EmailService.create_demo_proposal_for_vendor(rfp, vendor)
                        created_count += 1
                        logger.info(f"Created demo proposal for {vendor.name}")
                    except Exception as e:
                        logger.error(f"Failed to create demo proposal: {str(e)}")
                
                if created_count > 0:
                    message += f"\n\n📨 {created_count} demo proposal(s) have been automatically created and are ready for comparison."
            
            return Response({
                'success': True,
                'rfp_id': rfp.id,
                'rfp_title': rfp.title,
                'results': send_results,
                'vendor_count': len(send_results),
                'sent_count': successful_sends,
                'failed_count': len(failed_sends),
                'message': message,
                'demo_mode': settings.DEMO_MODE,
                'created_proposals': created_count if settings.DEMO_MODE else 0
            })
            
        except Exception as e:
            logger.error(f"Send RFP error: {str(e)}", exc_info=True)
            return Response({
                'error': 'Failed to send RFP',
                'details': str(e),
                'message': f'❌ Error sending RFP: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class CheckEmailsView(APIView):
    def post(self, request):
        try:
            # Check for new emails
            new_proposal_ids = EmailService.check_incoming_emails()
            
            # Parse new proposals
            parsed_count = EmailService.parse_new_proposals()
            
            # Count total proposals
            total_proposals = Proposal.objects.count()
            parsed_total = Proposal.objects.filter(is_parsed=True).count()
            
            if settings.DEMO_MODE:
                message = f'📧 DEMO MODE: Checked emails and created {len(new_proposal_ids)} new demo proposal(s).'
            else:
                message = f'📧 Found {len(new_proposal_ids)} new email(s), parsed {parsed_count} proposal(s).'
            
            return Response({
                'success': True,
                'new_emails': len(new_proposal_ids),
                'parsed_proposals': parsed_count,
                'total_proposals': total_proposals,
                'total_parsed': parsed_total,
                'demo_mode': settings.DEMO_MODE,
                'message': message
            })
            
        except Exception as e:
            logger.error(f"Check emails error: {str(e)}", exc_info=True)
            return Response({
                'error': 'Failed to check emails',
                'details': str(e),
                'message': f'❌ Error checking emails: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class ProposalListView(APIView):
    def get(self, request):
        rfp_id = request.query_params.get('rfp_id')
        if rfp_id:
            proposals = Proposal.objects.filter(rfp_id=rfp_id)
        else:
            proposals = Proposal.objects.all()
        
        serializer = ProposalSerializer(proposals, many=True)
        return Response(serializer.data)

class CompareProposalsView(APIView):
    def get(self, request, pk):
        try:
            rfp = get_object_or_404(RFP, pk=pk)
            
            # Get total proposals for this RFP
            all_proposals = Proposal.objects.filter(rfp=rfp)
            parsed_proposals = all_proposals.filter(is_parsed=True)
            
            if parsed_proposals.count() < 1:
                # Provide helpful message based on whether there are any proposals
                if all_proposals.count() == 0:
                    message = "❌ No proposals found for this RFP. Please send the RFP to vendors first."
                else:
                    message = f"⚠️ Found {all_proposals.count()} proposals but none are parsed yet. Please click 'Check Emails' to parse them."
                
                return Response({
                    'error': 'Need at least 1 parsed proposal for comparison',
                    'available_proposals': all_proposals.count(),
                    'parsed_proposals': parsed_proposals.count(),
                    'message': message
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Prepare data for AI
            proposals_data = [{
                'vendor_name': p.vendor.name,
                'vendor_id': p.vendor.id,
                'total_price': float(p.total_price) if p.total_price else 0,
                'proposed_delivery_days': p.proposed_delivery_days,
                'compliance_score': p.compliance_score,
                'warranty_offered': p.warranty_offered,
                'proposed_terms': p.proposed_terms
            } for p in parsed_proposals]
            
            rfp_data = {
                'title': rfp.title,
                'total_budget': float(rfp.total_budget),
                'delivery_days': rfp.delivery_days,
                'requirements': rfp.requirements
            }
            
            # Get AI comparison
            ai_result = AIService.compare_proposals_and_recommend(proposals_data, rfp_data)
            
            # Create or update comparison record
            comparison, created = Comparison.objects.get_or_create(
                rfp=rfp,
                defaults={
                    'ai_recommendation': ai_result,
                    'summary': ai_result.get('summary', 'AI Comparison Generated')
                }
            )
            
            if not created:
                comparison.ai_recommendation = ai_result
                comparison.summary = ai_result.get('summary', 'AI Comparison Updated')
                comparison.save()
            
            comparison.proposals.set(parsed_proposals)
            
            # Mark recommended proposal as preferred
            recommended_vendor_id = ai_result.get('recommendation', {}).get('vendor_id')
            if recommended_vendor_id:
                Proposal.objects.filter(rfp=rfp).update(is_preferred=False)
                Proposal.objects.filter(rfp=rfp, vendor_id=recommended_vendor_id).update(is_preferred=True)
            
            serializer = ComparisonSerializer(comparison)
            response_data = serializer.data
            response_data['proposal_details'] = proposals_data
            response_data['rfp_details'] = rfp_data
            
            # Add success message
            recommendation = ai_result.get('recommendation', {})
            response_data['message'] = f'✅ AI comparison generated successfully.\n\n📊 Compared {len(parsed_proposals)} proposals.\n🏆 Recommended vendor: {recommendation.get("vendor_name", "N/A")}\n🎯 Confidence: {recommendation.get("confidence_score", 0)}%'
            
            return Response(response_data)
            
        except Exception as e:
            logger.error(f"Compare proposals error: {str(e)}", exc_info=True)
            return Response({
                'error': 'Failed to compare proposals',
                'details': str(e),
                'message': f'❌ Error comparing proposals: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            
            
class GetComparisonView(APIView):
    def get(self, request, rfp_id):
        try:
            comparison = Comparison.objects.filter(rfp_id=rfp_id).first()
            if comparison:
                serializer = ComparisonSerializer(comparison)
                return Response(serializer.data)
            return Response({'message': 'No comparison found for this RFP'})
        except Exception as e:
            return Response({'error': str(e), 'message': f'❌ Error: {str(e)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class TestEmailView(APIView):
    def post(self, request):
        to_email = request.data.get('email')
        if not to_email:
            return Response({'error': 'Email address required', 'message': '❌ Email address is required'}, status=status.HTTP_400_BAD_REQUEST)
        
        success, message = EmailService.send_test_email(
            to_email,
            "RFP System Test Email",
            "This is a test email from the RFP Management System.\n\nIf you received this, your email configuration is working correctly."
        )
        
        if success:
            return Response({'success': True, 'message': f'✅ {message}'})
        else:
            return Response({'error': message, 'message': f'❌ {message}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class TestEmailConfigView(APIView):
    def get(self, request):
        success, message = EmailService.test_email_connection()
        if success:
            return Response({'success': True, 'message': f'✅ {message}'})
        else:
            return Response({'success': False, 'error': message, 'message': f'❌ {message}'})