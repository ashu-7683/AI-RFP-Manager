// Global state
let currentRFPId = null;
let aiParsedData = null;

// DOM Ready
document.addEventListener('DOMContentLoaded', () => {
    // Initialize the app
    initApp();
    
    // Set up event listeners
    setupEventListeners();
    
    // Load dashboard by default
    UIController.loadPage('dashboard');
    
    // Set default deadline to 2 weeks from now
    const deadlineInput = document.getElementById('rfp-deadline');
    if (deadlineInput) {
        const twoWeeksLater = new Date();
        twoWeeksLater.setDate(twoWeeksLater.getDate() + 14);
        deadlineInput.valueAsDate = twoWeeksLater;
    }
});

function initApp() {
    console.log('RFP Management System initialized');
    
    // Check if we have a backend connection
    testBackendConnection();
}

function setupEventListeners() {
    // Tab switching
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const tabId = btn.getAttribute('data-tab');
            UIController.switchTab(tabId);
        });
    });
    
    // Navigation buttons
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const pageId = btn.getAttribute('data-page');
            UIController.loadPage(pageId);
        });
    });
    
    // Manual RFP form submission
    const manualForm = document.getElementById('manual-rfp-form');
    if (manualForm) {
        manualForm.addEventListener('submit', handleManualRFPSubmit);
    }
    
    // Vendor form submission
    const vendorForm = document.getElementById('vendor-form');
    if (vendorForm) {
        vendorForm.addEventListener('submit', handleVendorSubmit);
    }
    
    // Close modals when clicking outside
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.classList.remove('active');
            }
        });
    });
}

// Backend Connection Test
async function testBackendConnection() {
    try {
        await fetch('http://localhost:8000/api/vendors/');
        console.log('Backend connection successful');
    } catch (error) {
        console.error('Backend connection failed:', error);
        showNotification('⚠️ Cannot connect to backend. Make sure Django server is running on port 8000.', 'error', 10000);
    }
}

// Notification System with improved display
function showNotification(message, type = 'info', duration = 5000) {
    // Remove existing notifications
    const existing = document.querySelector('.notification');
    if (existing) {
        existing.remove();
    }
    
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    
    // Format message with line breaks
    const formattedMessage = message.replace(/\n/g, '<br>');
    
    notification.innerHTML = `
        <div class="notification-content">
            <div class="notification-icon">
                ${type === 'success' ? '✅' : type === 'error' ? '❌' : type === 'warning' ? '⚠️' : 'ℹ️'}
            </div>
            <div class="notification-text">${formattedMessage}</div>
            <button class="notification-close" onclick="this.parentElement.parentElement.remove()">&times;</button>
        </div>
    `;
    
    document.body.appendChild(notification);
    
    // Add animation
    setTimeout(() => {
        notification.classList.add('show');
    }, 10);
    
    // Auto-remove after duration
    if (duration > 0) {
        setTimeout(() => {
            if (notification.parentElement) {
                notification.classList.remove('show');
                setTimeout(() => {
                    if (notification.parentElement) {
                        notification.remove();
                    }
                }, 300);
            }
        }, duration);
    }
}

// Vendor Functions
function showAddVendorModal() {
    const form = document.getElementById('vendor-form');
    form.reset();
    form.dataset.mode = 'create';
    UIController.showModal('vendor-modal');
}

async function editVendor(id) {
    try {
        const vendors = await ApiService.getVendors();
        const foundVendor = vendors.find(v => v.id === id);
        
        if (foundVendor) {
            const form = document.getElementById('vendor-form');
            form.dataset.mode = 'edit';
            form.dataset.vendorId = id;
            
            document.getElementById('vendor-name').value = foundVendor.name;
            document.getElementById('vendor-email').value = foundVendor.email;
            document.getElementById('vendor-contact').value = foundVendor.contact_person || '';
            document.getElementById('vendor-phone').value = foundVendor.phone || '';
            document.getElementById('vendor-category').value = foundVendor.category || 'General';
            
            UIController.showModal('vendor-modal');
        }
    } catch (error) {
        showNotification('❌ Error loading vendor details: ' + error.message, 'error');
    }
}

async function deleteVendor(id) {
    if (confirm('Are you sure you want to delete this vendor?')) {
        try {
            const success = await ApiService.deleteVendor(id);
            if (success) {
                showNotification('✅ Vendor deleted successfully', 'success');
                UIController.loadVendors();
                UIController.loadDashboard();
            }
        } catch (error) {
            showNotification('❌ Error deleting vendor: ' + error.message, 'error');
        }
    }
}

async function handleVendorSubmit(e) {
    e.preventDefault();
    
    const form = e.target;
    const mode = form.dataset.mode || 'create';
    
    const vendorData = {
        name: document.getElementById('vendor-name').value,
        email: document.getElementById('vendor-email').value,
        contact_person: document.getElementById('vendor-contact').value,
        phone: document.getElementById('vendor-phone').value,
        category: document.getElementById('vendor-category').value
    };
    
    try {
        if (mode === 'create') {
            await ApiService.createVendor(vendorData);
            showNotification('✅ Vendor added successfully', 'success');
        } else {
            const vendorId = form.dataset.vendorId;
            await ApiService.updateVendor(vendorId, vendorData);
            showNotification('✅ Vendor updated successfully', 'success');
        }
        
        UIController.closeModal('vendor-modal');
        UIController.loadVendors();
        UIController.loadDashboard();
        
    } catch (error) {
        showNotification('❌ Error saving vendor: ' + (error.message || 'Unknown error'), 'error');
    }
}

// RFP Functions
async function processUserInput() {
    const input = document.getElementById('user-input').value.trim();
    if (!input) {
        showNotification('⚠️ Please enter your procurement request', 'warning');
        return;
    }
    
    console.log("User input:", input);
    
    // Show user message
    UIController.addChatMessage(input, true);
    
    // Store input for later use
    window.lastUserInput = input;
    
    // Clear input
    document.getElementById('user-input').value = '';
    
    // Show loading indicator
    const loadingMsg = document.createElement('div');
    loadingMsg.className = 'message ai-message';
    loadingMsg.innerHTML = `
        <div class="avatar">
            <i class="fas fa-robot"></i>
        </div>
        <div class="content">
            <p><i class="fas fa-spinner fa-spin"></i> Processing your request...</p>
        </div>
    `;
    document.getElementById('chat-messages').appendChild(loadingMsg);
    document.getElementById('chat-messages').scrollTop = document.getElementById('chat-messages').scrollHeight;
    
    try {
        // Call AI service
        console.log("Calling AI service...");
        const parsedData = await ApiService.createRFPFromNaturalLanguage(input);
        
        console.log("AI parsed data received:", parsedData);
        
        // Remove loading message
        loadingMsg.remove();
        
        // Show AI response
        UIController.addChatMessage('✅ I\'ve parsed your request. Here\'s the structured RFP I created:');
        
        // Store parsed data and show preview
        aiParsedData = parsedData;
        aiParsedData.originalInput = input;  // Store original input
        UIController.showAIPreview(parsedData);
        
    } catch (error) {
        // Remove loading message
        loadingMsg.remove();
        
        // Show error
        UIController.addChatMessage('❌ Sorry, I encountered an error processing your request. Please try again or use the manual form.');
        console.error('AI Processing error:', error);
        showNotification('❌ AI Processing Error: ' + error.message, 'error');
    }
}

async function saveRFPAI() {
    if (!aiParsedData) {
        showNotification('❌ No AI data to save', 'error');
        return;
    }
    
    try {
        // Get the user input from chat - FIXED selector
        const userMessages = document.querySelectorAll('.user-message .content p');
        const userInput = userMessages.length > 0 ? 
            userMessages[userMessages.length - 1].textContent : 
            '';
        
        console.log("User input from chat:", userInput);
        console.log("AI parsed data:", aiParsedData);
        
        // Set deadline to 2 weeks from now
        const twoWeeksLater = new Date();
        twoWeeksLater.setDate(twoWeeksLater.getDate() + 14);
        
        // Build RFP data with correct structure
        const rfpData = {
            title: aiParsedData.title || `AI-Generated RFP - ${new Date().toLocaleDateString()}`,
            description: aiParsedData.description || userInput,
            natural_language: userInput,  // This is what was missing
            structured_data: aiParsedData,
            total_budget: parseFloat(aiParsedData.total_budget) || 0,
            delivery_days: parseInt(aiParsedData.delivery_days) || 30,
            payment_terms: aiParsedData.payment_terms || "Net 30",
            warranty: aiParsedData.warranty || "1 year",
            requirements: Array.isArray(aiParsedData.requirements) ? aiParsedData.requirements : [],
            deadline: twoWeeksLater.toISOString().split('T')[0]
        };
        
        console.log("📤 Sending AI RFP data:", rfpData);
        
        const savedRFP = await ApiService.createRFP(rfpData);
        
        showNotification(`✅ RFP "${savedRFP.title}" created successfully! You can now send it to vendors.`, 'success');
        
        // Reset chat and show success
        resetChat();
        UIController.addChatMessage(`✅ RFP "${savedRFP.title}" has been created. You can now send it to vendors.`);
        
        // Load RFPs page
        UIController.loadPage('rfps');
        
    } catch (error) {
        console.error("❌ Error saving AI RFP:", error);
        showNotification('❌ Error saving RFP: ' + error.message, 'error');
    }
}

function resetChat() {
    document.getElementById('chat-messages').innerHTML = `
        <div class="message ai-message">
            <div class="avatar">
                <i class="fas fa-robot"></i>
            </div>
            <div class="content">
                <p>Hello! I'm your AI procurement assistant. Tell me what you need to purchase in plain English, and I'll create an RFP for you.</p>
                <p class="example">Example: "I need 20 laptops with 16GB RAM and 15 monitors, budget $50,000, delivery in 30 days."</p>
            </div>
        </div>
    `;
    document.getElementById('ai-preview').classList.add('hidden');
    aiParsedData = null;
}

// Requirements Management
function addRequirement() {
    const container = document.getElementById('requirements-container');
    const newItem = document.createElement('div');
    newItem.className = 'requirement-item';
    newItem.innerHTML = `
        <input type="text" class="requirement-input" placeholder="Add a requirement...">
        <button type="button" class="remove-btn" onclick="removeRequirement(this)">
            <i class="fas fa-times"></i>
        </button>
    `;
    container.appendChild(newItem);
}

function removeRequirement(button) {
    const item = button.parentElement;
    if (document.querySelectorAll('.requirement-item').length > 1) {
        item.remove();
    } else {
        // Don't remove the last one, just clear it
        item.querySelector('.requirement-input').value = '';
    }
}

async function handleManualRFPSubmit(e) {
    e.preventDefault();
    
    console.log('🚀 Starting RFP creation...');
    
    const requirements = Array.from(document.querySelectorAll('.requirement-input'))
        .map(input => input.value.trim())
        .filter(value => value);
    
    const rfpData = {
        title: document.getElementById('rfp-title').value,
        description: document.getElementById('rfp-description').value,
        total_budget: parseFloat(document.getElementById('total-budget').value),
        delivery_days: parseInt(document.getElementById('delivery-days').value),
        payment_terms: document.getElementById('payment-terms').value,
        warranty: document.getElementById('warranty').value,
        requirements: requirements,
        deadline: document.getElementById('rfp-deadline').value
    };
    
    console.log('📤 Sending RFP data:', rfpData);
    
    try {
        showNotification('⏳ Creating RFP...', 'info');
        const savedRFP = await ApiService.createRFP(rfpData);
        console.log('✅ RFP created successfully:', savedRFP);
        
        showNotification(`✅ RFP "${savedRFP.title}" created successfully!`, 'success');
        
        // Reset form
        resetManualForm();
        
        // Auto-navigate to RFPs page
        setTimeout(() => {
            UIController.loadPage('rfps');
        }, 1000);
        
    } catch (error) {
        console.error('❌ Error saving RFP:', error);
        showNotification(`❌ Error: ${error.message || 'Failed to create RFP'}`, 'error');
    }
}

function resetManualForm() {
    document.getElementById('manual-rfp-form').reset();
    
    // Reset requirements to one empty field
    const container = document.getElementById('requirements-container');
    container.innerHTML = `
        <div class="requirement-item">
            <input type="text" class="requirement-input" placeholder="Add a requirement...">
            <button type="button" class="remove-btn" onclick="removeRequirement(this)">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `;
    
    // Set default deadline
    const twoWeeksLater = new Date();
    twoWeeksLater.setDate(twoWeeksLater.getDate() + 14);
    document.getElementById('rfp-deadline').valueAsDate = twoWeeksLater;
}

// RFP Actions
function viewRFP(id) {
    // For now, just show a simple alert
    showNotification(`📋 Viewing RFP details would show here in a complete implementation.`, 'info');
}

async function sendRFPToVendors(rfpId) {
    console.log(`📤 Attempting to send RFP ${rfpId} to vendors...`);
    
    currentRFPId = rfpId;
    
    try {
        // Show loading
        showNotification('⏳ Loading vendors...', 'info');
        
        // Load vendors for selection
        const vendors = await ApiService.getVendors();
        console.log('Available vendors:', vendors);
        
        const selector = document.getElementById('vendor-selector');
        
        if (!vendors || vendors.length === 0) {
            selector.innerHTML = '<div class="empty-message">No vendors available. Please add vendors first.</div>';
            showNotification('⚠️ No vendors found. Add vendors first.', 'warning');
            return;
        }
        
        // Clear and populate vendor selector
        selector.innerHTML = '';
        
        vendors.forEach(vendor => {
            const vendorDiv = document.createElement('div');
            vendorDiv.className = 'vendor-checkbox';
            vendorDiv.innerHTML = `
                <input type="checkbox" id="vendor-${vendor.id}" value="${vendor.id}" checked>
                <label for="vendor-${vendor.id}">
                    <strong>${vendor.name}</strong> (${vendor.email})
                    ${vendor.rating ? `<br><small>Rating: ${vendor.rating}/5</small>` : ''}
                </label>
            `;
            selector.appendChild(vendorDiv);
        });
        
        showNotification(`✅ Found ${vendors.length} vendors`, 'success');
        UIController.showModal('send-rfp-modal');
        
    } catch (error) {
        console.error('Error loading vendors:', error);
        showNotification('❌ Error loading vendors: ' + error.message, 'error');
    }
}

async function sendRFP() {
    if (!currentRFPId) {
        showNotification('❌ No RFP selected', 'error');
        return;
    }
    
    const selectedVendors = Array.from(
        document.querySelectorAll('#vendor-selector input[type="checkbox"]:checked')
    ).map(checkbox => parseInt(checkbox.value));
    
    if (selectedVendors.length === 0) {
        showNotification('⚠️ Please select at least one vendor', 'warning');
        return;
    }
    
    try {
        showNotification('📤 Sending RFP to vendors...', 'info', 0); // No auto-close during sending
        
        const result = await ApiService.sendRFP(currentRFPId, selectedVendors);
        
        console.log('Send RFP result:', result);
        
        if (result.error) {
            showNotification('❌ Error: ' + result.error, 'error', 8000);
            return;
        }
        
        // Show detailed success message
        if (result.message) {
            showNotification(result.message, 'success', 10000); // Show for 10 seconds
        } else {
            showNotification(`✅ RFP sent to ${result.sent_count} vendor(s) successfully!`, 'success', 8000);
        }
        
        // Close modal
        UIController.closeModal('send-rfp-modal');
        
        // Refresh all data
        setTimeout(() => {
            UIController.loadRFPs();
            UIController.loadProposals();
            UIController.loadDashboard();
            
            // If demo proposals were created, offer to check emails
            if (result.demo_mode && result.created_proposals > 0) {
                setTimeout(() => {
                    showNotification(
                        `📨 ${result.created_proposals} demo proposal(s) were created. Click "Check Emails" to see them.`,
                        'info',
                        8000
                    );
                }, 2000);
            }
        }, 1000);
        
    } catch (error) {
        console.error('Error sending RFP:', error);
        showNotification('❌ Error sending RFP: ' + error.message, 'error', 8000);
    }
}

// Proposal Functions
async function checkEmails() {
    try {
        showNotification('📧 Checking for new emails...', 'info', 0);
        
        const result = await ApiService.checkEmails();
        
        if (result.error) {
            showNotification('❌ Error: ' + result.error, 'error');
            return;
        }
        
        if (result.message) {
            showNotification(result.message, 'success', 8000);
        } else if (result.new_emails > 0) {
            showNotification(`✅ Found ${result.new_emails} new emails, parsed ${result.parsed_proposals} proposals`, 'success', 8000);
        } else {
            showNotification('📭 No new emails found', 'info');
        }
        
        // Refresh proposals list
        UIController.loadProposals();
        UIController.loadDashboard();
        
    } catch (error) {
        showNotification('❌ Error checking emails: ' + error.message, 'error');
    }
}

function parseProposal(proposalId) {
    showNotification('ℹ️ In demo mode, proposals are automatically parsed', 'info');
}

function viewProposalDetails(proposalId) {
    showNotification('📋 Viewing proposal details would show here in a complete implementation.', 'info');
}

// Comparison Functions
async function compareProposals(rfpId) {
    try {
        showNotification('🤖 Checking proposals for comparison...', 'info', 0);
        
        const comparison = await ApiService.compareProposals(rfpId);
        
        if (comparison.error) {
            // Show helpful message based on the error
            if (comparison.message) {
                showNotification(comparison.message, 'warning', 8000);
            } else {
                showNotification('❌ ' + comparison.error, 'error', 8000);
            }
            
            // Offer to check emails if there are unparsed proposals
            if (comparison.available_proposals > 0 && comparison.parsed_proposals === 0) {
                setTimeout(() => {
                    if (confirm("Would you like to parse the proposals now?")) {
                        checkEmails();
                    }
                }, 1000);
            }
            return;
        }
        
        if (comparison.message) {
            showNotification(comparison.message, 'success', 8000);
        }
        
        await UIController.showComparison(rfpId);
        
    } catch (error) {
        showNotification('❌ Error generating comparison: ' + error.message, 'error');
    }
}
// Email Testing
async function testEmailConfig() {
    const testEmail = prompt('Enter email address to send test email to:');
    if (!testEmail) return;
    
    try {
        showNotification('📧 Sending test email...', 'info');
        const result = await ApiService.testEmail(testEmail);
        
        if (result.error) {
            showNotification('❌ ' + result.error, 'error', 8000);
        } else if (result.message) {
            showNotification('✅ ' + result.message, 'success', 8000);
        }
    } catch (error) {
        showNotification('❌ Error sending test email: ' + error.message, 'error');
    }
}

// Debug functions
async function debugLoadRFPs() {
    console.log('🔄 Force refreshing RFPs...');
    try {
        const rfps = await ApiService.getRFPs();
        console.log('📋 All RFPs:', rfps);
        UIController.renderRFPs(rfps);
        showNotification(`✅ Loaded ${rfps.length} RFPs`, 'success');
    } catch (error) {
        console.error('Error:', error);
        showNotification('❌ Failed to load RFPs', 'error');
    }
}

async function debugCreateTestRFP() {
    const testRFP = {
        title: "Test RFP - " + new Date().toLocaleTimeString(),
        description: "This is a test RFP created via debug",
        total_budget: 10000,
        delivery_days: 30,
        payment_terms: "Net 30",
        warranty: "1 year",
        requirements: ["Test requirement 1", "Test requirement 2"],
        deadline: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    };
    
    console.log('Creating test RFP:', testRFP);
    
    try {
        const saved = await ApiService.createRFP(testRFP);
        console.log('Test RFP created:', saved);
        showNotification(`✅ Test RFP "${saved.title}" created!`, 'success');
        setTimeout(() => debugLoadRFPs(), 1000);
    } catch (error) {
        console.error('Failed:', error);
        showNotification('❌ Failed to create test RFP', 'error');
    }
}

async function debugCheckAllRFPs() {
    try {
        const rfps = await ApiService.getRFPs();
        console.group('📊 RFP Status Report');
        rfps.forEach((rfp, i) => {
            console.log(`${i+1}. ${rfp.title}`);
            console.log(`   Status: ${rfp.status} (${rfp.status_display})`);
            console.log(`   Vendors: ${rfp.vendor_count}`);
            console.log(`   ID: ${rfp.id}`);
        });
        console.groupEnd();
        showNotification(`ℹ️ Found ${rfps.length} RFPs - check console for details`, 'info');
    } catch (error) {
        console.error('Error:', error);
    }
}

// Make functions globally available
window.loadPage = UIController.loadPage;
window.showAddVendorModal = showAddVendorModal;
window.editVendor = editVendor;
window.deleteVendor = deleteVendor;
window.addRequirement = addRequirement;
window.removeRequirement = removeRequirement;
window.processUserInput = processUserInput;
window.saveRFPAI = saveRFPAI;
window.resetChat = resetChat;
window.resetManualForm = resetManualForm;
window.sendRFPToVendors = sendRFPToVendors;
window.sendRFP = sendRFP;
window.checkEmails = checkEmails;
window.parseProposal = parseProposal;
window.viewProposalDetails = viewProposalDetails;
window.compareProposals = compareProposals;
window.testEmailConfig = testEmailConfig;
window.closeModal = UIController.closeModal;
window.debugLoadRFPs = debugLoadRFPs;
window.debugCreateTestRFP = debugCreateTestRFP;
window.debugCheckAllRFPs = debugCheckAllRFPs;

// Add enhanced notification styles dynamically
const notificationStyles = document.createElement('style');
notificationStyles.textContent = `
    .notification {
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 20px;
        border-radius: 10px;
        color: white;
        display: flex;
        align-items: center;
        min-width: 320px;
        max-width: 450px;
        z-index: 10000;
        box-shadow: 0 5px 20px rgba(0,0,0,0.2);
        transform: translateX(120%);
        transition: transform 0.3s ease;
        opacity: 0;
        background: #2c3e50;
        border-left: 5px solid #3498db;
    }
    
    .notification.show {
        transform: translateX(0);
        opacity: 1;
    }
    
    .notification.success {
        background: #27ae60;
        border-left-color: #2ecc71;
    }
    
    .notification.error {
        background: #c0392b;
        border-left-color: #e74c3c;
    }
    
    .notification.warning {
        background: #d35400;
        border-left-color: #f39c12;
    }
    
    .notification.info {
        background: #2980b9;
        border-left-color: #3498db;
    }
    
    .notification-content {
        display: flex;
        align-items: flex-start;
        width: 100%;
    }
    
    .notification-icon {
        font-size: 1.5rem;
        margin-right: 15px;
        flex-shrink: 0;
    }
    
    .notification-text {
        flex-grow: 1;
        line-height: 1.5;
        font-size: 14px;
        word-break: break-word;
    }
    
    .notification-close {
        background: transparent;
        border: none;
        color: white;
        font-size: 1.5rem;
        cursor: pointer;
        padding: 0;
        margin-left: 15px;
        flex-shrink: 0;
        opacity: 0.8;
        transition: opacity 0.2s;
    }
    
    .notification-close:hover {
        opacity: 1;
    }
    
    .notification-text br {
        margin-bottom: 5px;
        display: block;
        content: "";
    }
    
    .status-badge {
        padding: 4px 12px;
        border-radius: 20px;
        font-size: 0.8rem;
        font-weight: 500;
    }
    
    .status-badge.draft { background: #95a5a6; color: white; }
    .status-badge.sent { background: #3498db; color: white; }
    .status-badge.review { background: #f39c12; color: white; }
    .status-badge.completed { background: #2ecc71; color: white; }
    .status-badge.cancelled { background: #e74c3c; color: white; }
    .status-badge.parsed { background: #2ecc71; color: white; }
    .status-badge.unparsed { background: #f39c12; color: white; }
    .status-badge.score { background: #9b59b6; color: white; }
    
    .empty-state {
        text-align: center;
        padding: 3rem;
        grid-column: 1 / -1;
    }
    
    .empty-state i {
        color: #bdc3c7;
        margin-bottom: 1rem;
    }
    
    .empty-state h3 {
        color: #7f8c8d;
        margin-bottom: 0.5rem;
    }
    
    .empty-state p {
        color: #95a5a6;
        margin-bottom: 1.5rem;
    }
    
    .recommended-badge {
        background: linear-gradient(135deg, #f39c12, #e74c3c);
        color: white;
        padding: 0.5rem 1rem;
        border-radius: 20px;
        font-size: 0.8rem;
        display: inline-flex;
        align-items: center;
        gap: 0.5rem;
        margin-bottom: 1rem;
    }
    
    .preferred {
        border: 2px solid #f39c12;
    }
    
    /* Email sending confirmation styles */
    .email-confirmation {
        background: #f8f9fa;
        border: 1px solid #dee2e6;
        border-radius: 10px;
        padding: 20px;
        margin: 20px 0;
    }
    
    .email-confirmation-header {
        display: flex;
        align-items: center;
        margin-bottom: 15px;
    }
    
    .email-confirmation-icon {
        background: #2ecc71;
        color: white;
        width: 40px;
        height: 40px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 1.2rem;
        margin-right: 15px;
    }
    
    .email-confirmation-title {
        font-size: 1.2rem;
        font-weight: 600;
        color: #2c3e50;
    }
    
    .email-confirmation-body {
        line-height: 1.6;
        color: #34495e;
    }
    
    .email-confirmation-vendors {
        margin: 15px 0;
        padding: 15px;
        background: white;
        border-radius: 8px;
        border: 1px solid #e9ecef;
    }
    
    .email-confirmation-vendor {
        display: flex;
        align-items: center;
        padding: 8px 0;
        border-bottom: 1px solid #f1f1f1;
    }
    
    .email-confirmation-vendor:last-child {
        border-bottom: none;
    }
    
    .email-confirmation-vendor-icon {
        color: #27ae60;
        margin-right: 10px;
    }
    
    .demo-mode-banner {
        background: #f39c12;
        color: white;
        padding: 10px 15px;
        border-radius: 5px;
        margin: 15px 0;
        font-weight: 500;
    }
`;
document.head.appendChild(notificationStyles);