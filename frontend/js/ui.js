class UIController {
    // Page Navigation
    static loadPage(pageId) {
        // Hide all pages
        document.querySelectorAll('.page').forEach(page => {
            page.classList.remove('active');
        });

        // Remove active class from all nav buttons
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.classList.remove('active');
        });

        // Show selected page
        const page = document.getElementById(`${pageId}-page`);
        if (page) {
            page.classList.add('active');
            
            // Mark corresponding nav button as active
            const navBtn = document.querySelector(`[data-page="${pageId}"]`);
            if (navBtn) {
                navBtn.classList.add('active');
            }

            // Load page data
            this.loadPageData(pageId);
        }
    }

    static loadPageData(pageId) {
        switch(pageId) {
            case 'dashboard':
                this.loadDashboard();
                break;
            case 'vendors':
                this.loadVendors();
                break;
            case 'rfps':
                this.loadRFPs();
                break;
            case 'proposals':
                this.loadProposals();
                break;
        }
    }

    // Modal Control
    static showModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.add('active');
        }
    }

    static closeModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.remove('active');
        }
    }

    // Tab Control
    static switchTab(tabId) {
        // Hide all tabs
        document.querySelectorAll('.tab-content').forEach(tab => {
            tab.classList.remove('active');
        });

        // Remove active class from all tab buttons
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.remove('active');
        });

        // Show selected tab
        const tab = document.getElementById(tabId);
        if (tab) {
            tab.classList.add('active');
        }

        // Mark tab button as active
        const tabBtn = document.querySelector(`[data-tab="${tabId}"]`);
        if (tabBtn) {
            tabBtn.classList.add('active');
        }
    }

    // Dashboard
    static async loadDashboard() {
        try {
            const [rfps, vendors, proposals] = await Promise.all([
                ApiService.getRFPs(),
                ApiService.getVendors(),
                ApiService.getProposals()
            ]);

            // Update stats
            document.getElementById('total-rfps').textContent = rfps.length || 0;
            document.getElementById('total-vendors').textContent = vendors.length || 0;
            document.getElementById('total-proposals').textContent = proposals.length || 0;
            
            const parsedProposals = proposals.filter(p => p.is_parsed).length;
            document.getElementById('parsed-proposals').textContent = parsedProposals;

            // Load recent RFPs
            this.renderRecentRFPs(rfps.slice(0, 5));
            
            // Load recent proposals
            this.renderRecentProposals(proposals.slice(0, 5));

        } catch (error) {
            console.error('Error loading dashboard:', error);
        }
    }

    static renderRecentRFPs(rfps) {
        const container = document.getElementById('recent-rfps');
        if (!rfps || rfps.length === 0) {
            container.innerHTML = '<p class="empty-message">No RFPs yet. Create your first one!</p>';
            return;
        }

        container.innerHTML = rfps.map(rfp => `
            <div class="recent-item">
                <div>
                    <div class="title">${rfp.title}</div>
                    <div class="date">Created: ${new Date(rfp.created_at).toLocaleDateString()}</div>
                </div>
                <span class="status-badge ${rfp.status}">${rfp.status_display}</span>
            </div>
        `).join('');
    }

    static renderRecentProposals(proposals) {
        const container = document.getElementById('recent-proposals');
        if (!proposals || proposals.length === 0) {
            container.innerHTML = '<p class="empty-message">No proposals yet.</p>';
            return;
        }

        container.innerHTML = proposals.map(proposal => `
            <div class="recent-item">
                <div>
                    <div class="title">${proposal.vendor_name || 'Unknown Vendor'}</div>
                    <div class="date">Received: ${new Date(proposal.received_at).toLocaleDateString()}</div>
                </div>
                ${proposal.is_parsed ? 
                    `<span class="status-badge parsed">✓ Parsed</span>` : 
                    `<span class="status-badge unparsed">⏳ Pending</span>`
                }
            </div>
        `).join('');
    }

    // Vendors
    static async loadVendors() {
        try {
            const vendors = await ApiService.getVendors();
            this.renderVendors(vendors);
        } catch (error) {
            console.error('Error loading vendors:', error);
            document.getElementById('vendor-list').innerHTML = 
                '<div class="error">Failed to load vendors</div>';
        }
    }

    static renderVendors(vendors) {
        const container = document.getElementById('vendor-list');
        
        if (!vendors || vendors.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-users fa-3x"></i>
                    <h3>No Vendors Yet</h3>
                    <p>Add your first vendor to get started</p>
                    <button class="primary-btn" onclick="showAddVendorModal()">
                        <i class="fas fa-plus"></i> Add First Vendor
                    </button>
                </div>
            `;
            return;
        }

        container.innerHTML = vendors.map(vendor => `
            <div class="list-card">
                <div class="list-card-header">
                    <div class="list-card-title">${vendor.name}</div>
                    ${!vendor.is_active ? 
                        `<span class="list-card-badge">Inactive</span>` : ''
                    }
                </div>
                <div class="list-card-content">
                    <p><i class="fas fa-envelope"></i> ${vendor.email}</p>
                    ${vendor.contact_person ? 
                        `<p><i class="fas fa-user"></i> ${vendor.contact_person}</p>` : ''
                    }
                    ${vendor.phone ? 
                        `<p><i class="fas fa-phone"></i> ${vendor.phone}</p>` : ''
                    }
                    <p><i class="fas fa-tag"></i> ${vendor.category}</p>
                    <p><i class="fas fa-star"></i> Rating: ${vendor.rating}/5</p>
                </div>
                <div class="list-card-footer">
                    <span class="date">Added: ${new Date(vendor.created_at).toLocaleDateString()}</span>
                    <div class="list-card-actions">
                        <button class="action-icon" onclick="editVendor(${vendor.id})">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="action-icon" onclick="deleteVendor(${vendor.id})">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            </div>
        `).join('');
    }

    // RFPs
    static async loadRFPs() {
        try {
            const rfps = await ApiService.getRFPs();
            this.renderRFPs(rfps);
        } catch (error) {
            console.error('Error loading RFPs:', error);
            document.getElementById('rfp-list').innerHTML = 
                '<div class="error">Failed to load RFPs</div>';
        }
    }

    static renderRFPs(rfps) {
    const container = document.getElementById('rfp-list');
    
    if (!rfps || rfps.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-file-alt fa-3x"></i>
                <h3>No RFPs Yet</h3>
                <p>Create your first RFP to get started</p>
                <button class="primary-btn" onclick="loadPage('create-rfp')">
                    <i class="fas fa-plus"></i> Create First RFP
                </button>
            </div>
        `;
        return;
    }

    container.innerHTML = rfps.map(rfp => {
        // Get proposal count for this RFP
        const hasProposals = rfp.vendor_count > 0;
        
        return `
            <div class="list-card" style="background: white; border-radius: 15px; padding: 1.5rem; box-shadow: 0 5px 15px rgba(0,0,0,0.1); margin: 1rem 0; border: 1px solid #e0e0e0;">
                <div class="list-card-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
                    <div class="list-card-title" style="font-weight: 600; color: #2c3e50; font-size: 1.1rem;">${rfp.title || 'Untitled RFP'}</div>
                    <span class="list-card-badge ${rfp.status || 'draft'}" style="background: #e74c3c; color: white; padding: 0.25rem 0.75rem; border-radius: 20px; font-size: 0.8rem;">
                        ${rfp.status_display || 'Draft'}
                    </span>
                </div>
                <div class="list-card-content" style="color: #7f8c8d; margin-bottom: 1.5rem;">
                    <p>${(rfp.description || '').substring(0, 100)}${(rfp.description || '').length > 100 ? '...' : ''}</p>
                    <div class="rfp-details" style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 0.5rem; margin-top: 1rem;">
                        <p><i class="fas fa-dollar-sign"></i> Budget: $${rfp.total_budget || 0}</p>
                        <p><i class="fas fa-calendar-day"></i> Deadline: ${rfp.deadline ? new Date(rfp.deadline).toLocaleDateString() : 'N/A'}</p>
                        <p><i class="fas fa-truck"></i> Delivery: ${rfp.delivery_days || 30} days</p>
                        <p><i class="fas fa-users"></i> Vendors: ${rfp.vendor_count || 0}</p>
                    </div>
                    ${hasProposals ? `
                        <div style="margin-top: 1rem; padding: 0.5rem; background: #f8f9fa; border-radius: 5px;">
                            <p><i class="fas fa-info-circle"></i> This RFP has been sent to ${rfp.vendor_count} vendor(s)</p>
                            <p style="font-size: 0.9rem; margin-top: 0.25rem;">Click "Check Emails" to parse proposals, then "Compare"</p>
                        </div>
                    ` : ''}
                </div>
                <div class="list-card-footer" style="display: flex; justify-content: space-between; align-items: center;">
                    <span class="date" style="color: #7f8c8d; font-size: 0.9rem;">Created: ${rfp.created_at ? new Date(rfp.created_at).toLocaleDateString() : 'N/A'}</span>
                    <div class="list-card-actions" style="display: flex; gap: 0.5rem;">
                        <button class="action-icon" onclick="sendRFPToVendors(${rfp.id})" style="background: #3498db; color: white; border: none; width: 36px; height: 36px; border-radius: 50%; cursor: pointer; display: flex; align-items: center; justify-content: center;">
                            <i class="fas fa-paper-plane"></i>
                        </button>
                        <button class="action-icon" onclick="viewRFP(${rfp.id})" style="background: #3498db; color: white; border: none; width: 36px; height: 36px; border-radius: 50%; cursor: pointer; display: flex; align-items: center; justify-content: center;">
                            <i class="fas fa-eye"></i>
                        </button>
                        ${hasProposals ? `
                            <button class="action-icon" onclick="compareProposals(${rfp.id})" style="background: #f39c12; color: white; border: none; width: 36px; height: 36px; border-radius: 50%; cursor: pointer; display: flex; align-items: center; justify-content: center;">
                                <i class="fas fa-chart-bar"></i>
                            </button>
                        ` : ''}
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

    // Proposals
    static async loadProposals() {
        try {
            const rfpFilter = document.getElementById('rfp-filter').value;
            const statusFilter = document.getElementById('status-filter').value;
            
            let proposals = await ApiService.getProposals(rfpFilter || null);
            
            // Apply status filter
            if (statusFilter === 'parsed') {
                proposals = proposals.filter(p => p.is_parsed);
            } else if (statusFilter === 'unparsed') {
                proposals = proposals.filter(p => !p.is_parsed);
            }
            
            this.renderProposals(proposals);
            this.loadRFPFilterOptions();
        } catch (error) {
            console.error('Error loading proposals:', error);
        }
    }

    static renderProposals(proposals) {
        const container = document.getElementById('proposal-list');
        
        if (!proposals || proposals.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-envelope fa-3x"></i>
                    <h3>No Proposals Yet</h3>
                    <p>Check for emails or send an RFP to vendors</p>
                    <button class="primary-btn" onclick="checkEmails()">
                        <i class="fas fa-sync-alt"></i> Check Emails
                    </button>
                </div>
            `;
            return;
        }

        container.innerHTML = proposals.map(proposal => `
            <div class="list-card ${proposal.is_preferred ? 'preferred' : ''}">
                ${proposal.is_preferred ? `
                    <div class="recommended-badge">
                        <i class="fas fa-crown"></i> AI Recommended
                    </div>
                ` : ''}
                <div class="list-card-header">
                    <div class="list-card-title">${proposal.vendor_name || 'Unknown Vendor'}</div>
                    <div>
                        ${proposal.is_parsed ? 
                            `<span class="list-card-badge parsed">✓ Parsed</span>` : 
                            `<span class="list-card-badge unparsed">Pending</span>`
                        }
                        ${proposal.compliance_score ? 
                            `<span class="list-card-badge score">${proposal.compliance_score}%</span>` : ''
                        }
                    </div>
                </div>
                <div class="list-card-content">
                    <p><strong>RFP:</strong> ${proposal.rfp_title}</p>
                    <p><strong>Subject:</strong> ${proposal.email_subject}</p>
                    ${proposal.total_price ? 
                        `<p><i class="fas fa-dollar-sign"></i> Price: $${proposal.total_price}</p>` : 
                        '<p><i class="fas fa-dollar-sign"></i> Price: Not specified</p>'
                    }
                    ${proposal.proposed_delivery_days ? 
                        `<p><i class="fas fa-calendar-day"></i> Delivery: ${proposal.proposed_delivery_days} days</p>` : 
                        '<p><i class="fas fa-calendar-day"></i> Delivery: Not specified</p>'
                    }
                    <p><i class="fas fa-envelope"></i> Received: ${new Date(proposal.received_at).toLocaleDateString()}</p>
                </div>
                <div class="list-card-footer">
                    <span class="date">${proposal.vendor_email}</span>
                    <div class="list-card-actions">
                        ${proposal.is_parsed ? `
                            <button class="action-icon" onclick="viewProposalDetails(${proposal.id})">
                                <i class="fas fa-eye"></i>
                            </button>
                        ` : ''}
                        ${!proposal.is_parsed ? `
                            <button class="action-icon" onclick="parseProposal(${proposal.id})">
                                <i class="fas fa-robot"></i>
                            </button>
                        ` : ''}
                    </div>
                </div>
            </div>
        `).join('');
    }

    static async loadRFPFilterOptions() {
        try {
            const rfps = await ApiService.getRFPs();
            const select = document.getElementById('rfp-filter');
            
            // Keep the current value
            const currentValue = select.value;
            
            // Clear existing options except "All RFPs"
            while (select.options.length > 1) {
                select.remove(1);
            }
            
            // Add new options
            rfps.forEach(rfp => {
                const option = document.createElement('option');
                option.value = rfp.id;
                option.textContent = rfp.title;
                select.appendChild(option);
            });
            
            // Restore selected value if it still exists
            if (currentValue) {
                select.value = currentValue;
            }
        } catch (error) {
            console.error('Error loading RFP filter options:', error);
        }
    }

    // AI Chat
    static addChatMessage(content, isUser = false) {
        const messagesContainer = document.getElementById('chat-messages');
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${isUser ? 'user-message' : 'ai-message'}`;
        
        messageDiv.innerHTML = `
            <div class="avatar">
                <i class="fas ${isUser ? 'fa-user' : 'fa-robot'}"></i>
            </div>
            <div class="content">
                <p>${content}</p>
            </div>
        `;
        
        messagesContainer.appendChild(messageDiv);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    static showAIPreview(parsedData) {
    const preview = document.getElementById('ai-preview');
    const content = document.getElementById('preview-content');
    
    content.innerHTML = `
        <div class="preview-item">
            <h4><i class="fas fa-heading"></i> Title</h4>
            <p>${parsedData.title || 'Not specified'}</p>
        </div>
        <div class="preview-item">
            <h4><i class="fas fa-align-left"></i> Description</h4>
            <p>${parsedData.description || 'Not specified'}</p>
        </div>
        <div class="preview-item">
            <h4><i class="fas fa-dollar-sign"></i> Budget</h4>
            <p>$${parsedData.total_budget || 0}</p>
        </div>
        <div class="preview-item">
            <h4><i class="fas fa-calendar-day"></i> Delivery Timeline</h4>
            <p>${parsedData.delivery_days || 30} days</p>
        </div>
        <div class="preview-item">
            <h4><i class="fas fa-file-contract"></i> Payment Terms</h4>
            <p>${parsedData.payment_terms || 'Not specified'}</p>
        </div>
        <div class="preview-item">
            <h4><i class="fas fa-shield-alt"></i> Warranty</h4>
            <p>${parsedData.warranty || 'Not specified'}</p>
        </div>
        <div class="preview-item">
            <h4><i class="fas fa-list-check"></i> Requirements</h4>
            ${parsedData.requirements && parsedData.requirements.length > 0 ? 
                parsedData.requirements.map(req => `<p>• ${req}</p>`).join('') : 
                '<p>No specific requirements</p>'
            }
        </div>
    `;
    
    preview.classList.remove('hidden');
    preview.scrollIntoView({ behavior: 'smooth' });
}

    // Comparison View
    static async showComparison(rfpId) {
        try {
            const comparison = await ApiService.getComparison(rfpId);
            if (comparison.message) {
                // No comparison exists, create one
                const newComparison = await ApiService.compareProposals(rfpId);
                this.renderComparison(newComparison);
            } else {
                this.renderComparison(comparison);
            }
        } catch (error) {
            console.error('Error showing comparison:', error);
        }
    }

    static renderComparison(comparison) {
        const container = document.getElementById('comparison-content');
        
        if (!comparison) {
            container.innerHTML = '<p>Unable to generate comparison</p>';
            return;
        }

        const recommendation = comparison.ai_recommendation?.recommendation;
        const analysis = comparison.ai_recommendation?.analysis;
        
        container.innerHTML = `
            ${recommendation?.vendor_name ? `
                <div class="recommendation-box">
                    <h3><i class="fas fa-crown"></i> AI Recommendation</h3>
                    <p><strong>Recommended Vendor:</strong> ${recommendation.vendor_name}</p>
                    <p><strong>Confidence:</strong> ${recommendation.confidence_score || 'N/A'}%</p>
                    <p><strong>Reasoning:</strong> ${recommendation.reasoning || 'No reasoning provided'}</p>
                </div>
            ` : ''}
            
            ${comparison.summary ? `
                <div class="summary-box">
                    <h3><i class="fas fa-chart-pie"></i> Summary</h3>
                    <p>${comparison.summary}</p>
                </div>
            ` : ''}
            
            ${analysis ? `
                <div class="analysis-section">
                    <h3><i class="fas fa-chart-line"></i> Analysis</h3>
                    ${analysis.price_analysis ? `
                        <div class="analysis-item">
                            <h4><i class="fas fa-dollar-sign"></i> Price Analysis</h4>
                            <p>${analysis.price_analysis}</p>
                        </div>
                    ` : ''}
                    ${analysis.compliance_analysis ? `
                        <div class="analysis-item">
                            <h4><i class="fas fa-check-circle"></i> Compliance Analysis</h4>
                            <p>${analysis.compliance_analysis}</p>
                        </div>
                    ` : ''}
                    ${analysis.delivery_analysis ? `
                        <div class="analysis-item">
                            <h4><i class="fas fa-truck"></i> Delivery Analysis</h4>
                            <p>${analysis.delivery_analysis}</p>
                        </div>
                    ` : ''}
                    ${analysis.risk_assessment ? `
                        <div class="analysis-item">
                            <h4><i class="fas fa-exclamation-triangle"></i> Risk Assessment</h4>
                            <p>${analysis.risk_assessment}</p>
                        </div>
                    ` : ''}
                </div>
            ` : ''}
            
            ${comparison.proposal_details && comparison.proposal_details.length > 0 ? `
                <div class="proposals-section">
                    <h3><i class="fas fa-file-alt"></i> Proposals</h3>
                    <div class="proposals-grid">
                        ${comparison.proposal_details.map(proposal => `
                            <div class="proposal-card ${proposal.is_preferred ? 'preferred' : ''}">
                                <h4>${proposal.vendor_name}</h4>
                                <p><strong>Price:</strong> $${proposal.total_price || 'N/A'}</p>
                                <p><strong>Delivery:</strong> ${proposal.proposed_delivery_days || 'N/A'} days</p>
                                <p><strong>Compliance:</strong> ${proposal.compliance_score || 0}%</p>
                                <p><strong>Status:</strong> ${proposal.is_parsed ? 'Parsed' : 'Pending'}</p>
                            </div>
                        `).join('')}
                    </div>
                </div>
            ` : ''}
        `;
        
        this.showModal('comparison-modal');
    }
}