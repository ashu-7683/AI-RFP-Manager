# Email Setup Guide for RFP System

## Option 1: Use Gmail (Recommended for Testing)

### Step 1: Create a Gmail Account (or use existing)
- Use a dedicated email for testing
- Example: yourcompany.rfp.test@gmail.com

### Step 2: Enable 2-Factor Authentication
1. Go to Google Account Security
2. Enable 2-Step Verification

### Step 3: Create App Password
1. Go to https://myaccount.google.com/apppasswords
2. Select "Mail" and "Other (Custom name)"
3. Name it "RFP System"
4. Copy the 16-character password

### Step 4: Update Settings
In `settings.py`, update:
```python
EMAIL_SENDING_ENABLED = True  # Set to True for real emails
EMAIL_RECEIVING_ENABLED = True  # Set to True for checking emails

EMAIL_HOST_USER = 'your-email@gmail.com'
EMAIL_HOST_PASSWORD = 'your-16-character-app-password'  # App password, NOT your regular password
DEFAULT_FROM_EMAIL = 'your-email@gmail.com'

DEMO_MODE = False  # Set to False for real email operation