from django.urls import path
from . import views
from django.http import JsonResponse


urlpatterns = [
    # Vendor endpoints
    path('vendors/', views.VendorListCreateView.as_view(), name='vendor-list'),
    path('vendors/<int:pk>/', views.VendorDetailView.as_view(), name='vendor-detail'),
    
    # RFP endpoints
    path('rfps/', views.RFPListCreateView.as_view(), name='rfp-list'),
    path('rfps/<int:pk>/', views.RFPDetailView.as_view(), name='rfp-detail'),
    path('rfps/<int:pk>/send/', views.SendRFPView.as_view(), name='send-rfp'),
    path('rfps/<int:pk>/compare/', views.CompareProposalsView.as_view(), name='compare-proposals'),
    path('rfps/<int:pk>/comparison/', views.GetComparisonView.as_view(), name='get-comparison'),
    
    # Proposal endpoints
    path('proposals/', views.ProposalListView.as_view(), name='proposal-list'),
    
    # AI endpoints
    path('parse-natural-language/', views.ParseNaturalLanguageView.as_view(), name='parse-natural-language'),
    
    # Email endpoints
    path('check-emails/', views.CheckEmailsView.as_view(), name='check-emails'),
    path('test-email/', views.TestEmailView.as_view(), name='test-email'),
    path('test-email-config/', views.TestEmailConfigView.as_view(), name='test-email-config'),
    
    # Debug endpoints
    path('debug/status/',views.debug_status, name='debug-status'),
]