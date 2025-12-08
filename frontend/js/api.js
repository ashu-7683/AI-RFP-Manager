const API_BASE_URL = 'http://localhost:8000/api';

class ApiService {
    // Vendors
    static async getVendors() {
        const response = await fetch(`${API_BASE_URL}/vendors/`);
        if (!response.ok) {
            throw new Error(`Failed to fetch vendors: ${response.statusText}`);
        }
        return response.json();
    }

    static async createVendor(vendorData) {
        const response = await fetch(`${API_BASE_URL}/vendors/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(vendorData)
        });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.details || error.error || `Failed to create vendor: ${response.statusText}`);
        }
        return response.json();
    }

    static async updateVendor(id, vendorData) {
        const response = await fetch(`${API_BASE_URL}/vendors/${id}/`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(vendorData)
        });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.details || error.error || `Failed to update vendor: ${response.statusText}`);
        }
        return response.json();
    }

    static async deleteVendor(id) {
        const response = await fetch(`${API_BASE_URL}/vendors/${id}/`, {
            method: 'DELETE'
        });
        return response.ok;
    }

    // RFPs
    static async getRFPs() {
        const response = await fetch(`${API_BASE_URL}/rfps/`);
        if (!response.ok) {
            throw new Error(`Failed to fetch RFPs: ${response.statusText}`);
        }
        return response.json();
    }

    static async getRFP(id) {
        const response = await fetch(`${API_BASE_URL}/rfps/${id}/`);
        if (!response.ok) {
            throw new Error(`Failed to fetch RFP: ${response.statusText}`);
        }
        return response.json();
    }

    static async createRFP(rfpData) {
        const response = await fetch(`${API_BASE_URL}/rfps/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(rfpData)
        });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.details || error.error || `Failed to create RFP: ${response.statusText}`);
        }
        return response.json();
    }

    static async createRFPFromNaturalLanguage(text) {
        const response = await fetch(`${API_BASE_URL}/parse-natural-language/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ text })
        });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.details || error.error || `Failed to parse natural language: ${response.statusText}`);
        }
        return response.json();
    }

    static async sendRFP(rfpId, vendorIds) {
        try {
            const response = await fetch(`${API_BASE_URL}/rfps/${rfpId}/send/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ vendor_ids: vendorIds })
            });
            
            const result = await response.json();
            
            if (!response.ok) {
                throw new Error(result.error || result.message || `HTTP ${response.status}: ${response.statusText}`);
            }
            
            return result;
        } catch (error) {
            console.error('API Error in sendRFP:', error);
            throw error;
        }
    }

    // Proposals
    static async getProposals(rfpId = null) {
        let url = `${API_BASE_URL}/proposals/`;
        if (rfpId) {
            url += `?rfp_id=${rfpId}`;
        }
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Failed to fetch proposals: ${response.statusText}`);
        }
        return response.json();
    }

    static async checkEmails() {
        const response = await fetch(`${API_BASE_URL}/check-emails/`, {
            method: 'POST'
        });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.details || error.error || `Failed to check emails: ${response.statusText}`);
        }
        return response.json();
    }

    // Comparison
    static async compareProposals(rfpId) {
        const response = await fetch(`${API_BASE_URL}/rfps/${rfpId}/compare/`, {
            method: 'GET'
        });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.details || error.error || `Failed to compare proposals: ${response.statusText}`);
        }
        return response.json();
    }

    static async getComparison(rfpId) {
        const response = await fetch(`${API_BASE_URL}/rfps/${rfpId}/comparison/`);
        if (!response.ok) {
            throw new Error(`Failed to fetch comparison: ${response.statusText}`);
        }
        return response.json();
    }

    // Email Testing
    static async testEmail(email) {
        const response = await fetch(`${API_BASE_URL}/test-email/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email })
        });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.details || error.error || `Failed to send test email: ${response.statusText}`);
        }
        return response.json();
    }

    static async testEmailConfig() {
        const response = await fetch(`${API_BASE_URL}/test-email-config/`, {
            method: 'GET'
        });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.details || error.error || `Failed to test email config: ${response.statusText}`);
        }
        return response.json();
    }

    // Utility
    static async fetchWithTimeout(url, options = {}, timeout = 10000) {
        const controller = new AbortController();
        const id = setTimeout(() => controller.abort(), timeout);

        try {
            const response = await fetch(url, {
                ...options,
                signal: controller.signal
            });
            clearTimeout(id);
            return response;
        } catch (error) {
            clearTimeout(id);
            throw error;
        }
    }

    static handleApiError(error) {
        console.error('API Error:', error);
        return {
            error: true,
            message: error.message || 'An error occurred'
        };
    }
}