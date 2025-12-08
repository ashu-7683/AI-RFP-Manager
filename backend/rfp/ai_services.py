import os
import json
import openai
import random
from django.conf import settings
from datetime import datetime, timedelta

class AIService:
    DEMO_MODE = getattr(settings, 'AI_DEMO_MODE', True)
    
    @staticmethod
    def parse_natural_language_to_rfp(user_input):
        """
        Converts natural language procurement request to structured RFP
        """
        print(f"DEBUG: Processing user input: {user_input}")
        
        if AIService.DEMO_MODE:
            # Extract budget from user input
            import re
            budget_match = re.search(r'\$(\d+(?:,\d{3})*(?:\.\d{2})?)', user_input)
            total_budget = float(budget_match.group(1).replace(',', '')) if budget_match else 5000.00
            
            # Extract delivery days
            delivery_match = re.search(r'(\d+)\s*days?', user_input, re.IGNORECASE)
            delivery_days = int(delivery_match.group(1)) if delivery_match else 30
            
            # Extract keywords for better titles
            keywords = ["laptops", "computers", "monitors", "equipment", "software", "services"]
            matched_keyword = next((k for k in keywords if k in user_input.lower()), "procurement")
            
            # Return fields that match RFP model
            return {
                "title": f"RFP for {matched_keyword.title()} - {datetime.now().strftime('%Y-%m-%d')}",
                "description": user_input,
                "total_budget": total_budget,  # Use extracted budget
                "delivery_days": delivery_days,  # Use extracted delivery days
                "payment_terms": "Net 30",
                "warranty": "1 year",
                "requirements": [
                    "New units only with original packaging",
                    "On-site warranty support required",
                    "Must include installation services",
                    "Delivery within specified timeframe"
                ]
            }
        
        try:
            # Use OpenAI API
            openai.api_key = settings.OPENAI_API_KEY
            
            prompt = f"""
            Convert this procurement request into a structured RFP JSON format:
            
            "{user_input}"
            
            Return ONLY valid JSON with this exact structure:
            {{
                "title": "string",
                "description": "string",
                "items": [{{"name": "string", "quantity": number, "specifications": "string"}}],
                "total_budget": number,
                "delivery_days": number,
                "payment_terms": "string",
                "warranty": "string",
                "requirements": ["string"]
            }}
            """
            
            response = openai.ChatCompletion.create(
                model="gpt-3.5-turbo",
                messages=[
                    {"role": "system", "content": "You are a procurement assistant that converts natural language to structured RFP data. Always return valid JSON."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.1,
                max_tokens=1000
            )
            
            content = response.choices[0].message.content.strip()
            
            # Extract JSON from response
            if '```json' in content:
                content = content.split('```json')[1].split('```')[0].strip()
            elif '```' in content:
                content = content.split('```')[1].strip()
            
            parsed_data = json.loads(content)
            
            # Ensure all required fields exist
            if 'requirements' not in parsed_data:
                parsed_data['requirements'] = []
            if 'items' not in parsed_data:
                parsed_data['items'] = []
            
            return parsed_data
            
        except Exception as e:
            print(f"OpenAI Error: {e}")
            # Fallback to demo data
            return AIService.parse_natural_language_to_rfp(user_input)
    
    @staticmethod
    def compare_proposals_and_recommend(proposals_data, rfp_data):
        """
        AI-powered comparison and recommendation of proposals
        """
        if not proposals_data:
            return {
                "summary": "No proposals available for comparison.",
                "recommendation": {
                    "vendor_id": None,
                    "vendor_name": "None",
                    "reasoning": "No proposals received",
                    "confidence_score": 0
                },
                "analysis": {
                    "price_analysis": "N/A",
                    "compliance_analysis": "N/A",
                    "delivery_analysis": "N/A",
                    "risk_assessment": "N/A"
                }
            }
        
        if AIService.DEMO_MODE:
            # Find best proposal based on score
            best_proposal = max(proposals_data, key=lambda x: x.get('compliance_score', 0))
            
            return {
                "summary": f"Compared {len(proposals_data)} proposals. {best_proposal['vendor_name']} offers the best value.",
                "recommendation": {
                    "vendor_id": best_proposal.get('vendor_id'),
                    "vendor_name": best_proposal.get('vendor_name'),
                    "reasoning": f"Best compliance score ({best_proposal.get('compliance_score')}%) with competitive pricing.",
                    "confidence_score": 85
                },
                "analysis": {
                    "price_analysis": f"Price range: ${min(p.get('total_price', 0) for p in proposals_data):,.2f} - ${max(p.get('total_price', 0) for p in proposals_data):,.2f}",
                    "compliance_analysis": f"Compliance scores range from {min(p.get('compliance_score', 0) for p in proposals_data)}% to {max(p.get('compliance_score', 0) for p in proposals_data)}%",
                    "delivery_analysis": f"Delivery times range from {min(p.get('proposed_delivery_days', 30) for p in proposals_data)} to {max(p.get('proposed_delivery_days', 30) for p in proposals_data)} days",
                    "risk_assessment": "All vendors have good track records. Recommended vendor has highest compliance."
                }
            }
        
        try:
            # Use OpenAI for real comparison
            prompt = f"""
            Compare these vendor proposals for RFP: {rfp_data.get('title', 'Unknown')}
            
            RFP Requirements:
            - Budget: ${rfp_data.get('total_budget', 0)}
            - Delivery: {rfp_data.get('delivery_days', 30)} days
            - Requirements: {rfp_data.get('requirements', [])}
            
            Proposals:
            {json.dumps(proposals_data, indent=2)}
            
            Analyze and provide a recommendation. Return JSON:
            {{
                "summary": "string",
                "recommendation": {{
                    "vendor_id": number,
                    "vendor_name": "string",
                    "reasoning": "string",
                    "confidence_score": number
                }},
                "analysis": {{
                    "price_analysis": "string",
                    "compliance_analysis": "string",
                    "delivery_analysis": "string",
                    "risk_assessment": "string"
                }}
            }}
            """
            
            response = openai.ChatCompletion.create(
                model="gpt-3.5-turbo",
                messages=[
                    {"role": "system", "content": "You are a procurement analyst. Compare proposals and recommend the best vendor with reasoning."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.1,
                max_tokens=1000
            )
            
            content = response.choices[0].message.content.strip()
            
            # Extract JSON from response
            if '```json' in content:
                content = content.split('```json')[1].split('```')[0].strip()
            elif '```' in content:
                content = content.split('```')[1].strip()
            
            return json.loads(content)
            
        except Exception as e:
            print(f"AI Comparison Error: {e}")
            # Fallback to simple comparison
            return AIService.compare_proposals_and_recommend(proposals_data, rfp_data)
            
    @staticmethod
    def parse_vendor_response(email_text, rfp_requirements):
        """
        Extracts key details from vendor email responses
        """
        if AIService.DEMO_MODE:
            # Demo parsing logic
            return {
                "total_price": 45000 + random.randint(-5000, 5000),
                "delivery_days": 25 + random.randint(-5, 10),
                "payment_terms": "Net 30",
                "warranty": "3 years",
                "compliance_analysis": [
                    {"requirement": req, "status": "yes", "notes": "Compliant"} 
                    for req in rfp_requirements[:3]
                ],
                "additional_notes": "We look forward to working with you",
                "compliance_score": 85 + random.randint(-10, 10)
            }
        
        try:
            prompt = f"""
            Extract procurement proposal details from vendor email response.
            
            RFP Requirements: {json.dumps(rfp_requirements, indent=2)}
            
            Vendor Email: {email_text}
            
            Extract the following information:
            1. Total quoted price (numeric)
            2. Delivery timeline in days (numeric)
            3. Payment terms proposed
            4. Warranty details offered
            5. Compliance with requirements (list each requirement with yes/no/partial)
            6. Additional notes or conditions
            
            Return as JSON with this structure:
            {{
                "total_price": number,
                "delivery_days": number,
                "payment_terms": "string",
                "warranty": "string",
                "compliance_analysis": [
                    {{"requirement": "string", "status": "yes|no|partial", "notes": "string"}}
                ],
                "additional_notes": "string"
            }}
            """
            
            response = openai.ChatCompletion.create(
                model="gpt-3.5-turbo",
                messages=[
                    {"role": "system", "content": "You are a procurement analyst that extracts structured data from vendor emails."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.1,
                max_tokens=1000
            )
            
            content = response.choices[0].message.content.strip()
            # Extract JSON from response
            if '```json' in content:
                content = content.split('```json')[1].split('```')[0].strip()
            elif '```' in content:
                content = content.split('```')[1].strip()
                
            parsed_data = json.loads(content)
            
            # Calculate compliance score
            compliance_items = parsed_data.get('compliance_analysis', [])
            if compliance_items:
                total = len(compliance_items)
                compliant = sum(1 for item in compliance_items if item.get('status') == 'yes')
                partial = sum(1 for item in compliance_items if item.get('status') == 'partial') * 0.5
                parsed_data['compliance_score'] = round(((compliant + partial) / total) * 100, 2)
            else:
                parsed_data['compliance_score'] = 0
                
            return parsed_data
            
        except Exception as e:
            print(f"Vendor Response Parsing Error: {e}")
            return {
                "total_price": None,
                "delivery_days": None,
                "payment_terms": "",
                "warranty": "",
                "compliance_analysis": [],
                "additional_notes": "",
                "compliance_score": 0
            }