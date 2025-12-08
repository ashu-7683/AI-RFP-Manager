# AI-Powered RFP Management System

A single-user web application that streamlines the Request for Proposal (RFP) process using artificial intelligence.

## Features

1. **AI-Powered RFP Creation**: Convert natural language procurement requests into structured RFPs
2. **Vendor Management**: Maintain vendor database and contact information
3. **Email Integration**: Send RFPs via email and receive vendor responses
4. **AI Response Parsing**: Automatically extract key details from vendor proposals
5. **Intelligent Comparison**: AI-powered proposal comparison and vendor recommendations

## Tech Stack

### Backend
- **Framework**: Django 5.2.8 
- **API**: Django REST Framework
- **Database**: SQLite3
- **AI**: OpenAI GPT-3.5/4
- **Email**: SMTP/IMAP (Gmail compatible)
- **Authentication**: None (single-user system)

### Frontend
- **HTML5**: Semantic markup
- **CSS3**: Custom responsive design
- **JavaScript**: Vanilla ES6 with modern APIs

## Third-Party Services
- **AI**: OpenAI API
- **Email**: Gmail SMTP/IMAP
- **Hosting**: Local development(port 8000)
  
## Prerequisites

- Python 3.8+
- OpenAI API key
- Email account with SMTP/IMAP access (Gmail recommended)

## Installation

### 1. Clone the Repository
bash
git clone <repository-url>
cd AI-RFP-Manager

### 2. Backend Setup

cd backend

# Create virtual environment
python -m venv venv

# Activate virtual environment

# Windows:
venv\Scripts\activate

# Linux/Mac:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Copy environment variables
cp ../.env.example .env
# Edit .env with your actual values

### 3. Configure Environment Variables

- **SECRET_KEY**='your-secret-key'
- **DEBUG**=True
- **EMAIL_HOST_USER**='your-email@gmail.com'
- **EMAIL_HOST_PASSWORD**='your-app-password'
- **OPENAI_API_KEY**='your-openai-api-key'
- **DEMO_MODE**=True
- **AI_DEMO_MODE**=True

### 4. Database Setup
1.python manage.py migrate 
2.python manage.py createsuperuser  # Optional for admin panel
3.python setup_demo_data.py        # Load demo vendors and RFP

### 5. Frontend Setup
cd ../frontend
# No installation required - pure HTML/JS/CSS

### 6. Run the Application

cd backend  <br>
python manage.py runserver

## 📧 Email Configuration
For Real Email Sending/Receiving: <br>
-Use a Gmail account with 2FA enabled <br>
-Generate an App Password from Google Account settings <br>
.Update .env with your credentials <br>
-Set DEMO_MODE=False in .env <br>

## Demo Mode (Recommended for Testing):
Set DEMO_MODE=True in .env <br>
System creates fake proposals automatically <br>
No actual emails sent/received <br>
Perfect for development and demonstration <br>




