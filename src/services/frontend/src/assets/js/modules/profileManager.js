import { AuthManager } from './authManager.js';
import { UIManager } from './uiManager.js';

export class ProfileManager {
    static async fetchUserProfile() {
        try {
            const response = await AuthManager.fetchWithAuth(`${AuthManager.API_BASE}users/me/`);
            if (!response.ok) throw new Error('Failed to fetch profile');
            return await response.json();
        } catch (error) {
            console.error('Error fetching user profile:', error);
            return null;
        }
    }

    static async updateProfile(formData) {
        try {
            const hasFile = formData.get('avatar') && formData.get('avatar').size > 0;
            let requestData;
            let headers = {};

            if (hasFile) {
                requestData = formData;
            } else {
                const jsonData = {};
                const username = formData.get('username');
                const email = formData.get('email');
                const password = formData.get('password');

                // Get current user data for required fields
                const currentUser = AuthManager.currentUser;

                // Include current values if fields are empty
                if (username && username.trim()) {
                    jsonData.username = username.trim();
                } else if (currentUser?.username) {
                    jsonData.username = currentUser.username;
                }

                if (email && email.trim()) {
                    jsonData.email = email.trim().toLowerCase();
                } else if (currentUser?.email) {
                    jsonData.email = currentUser.email;
                }

                if (password && password.trim()) {
                    jsonData.password = password.trim();
                }

                // Log the data (excluding password)
                console.log('Request data:', { 
                    ...jsonData, 
                    password: jsonData.password ? '[REDACTED]' : null,
                    currentUsername: currentUser?.username,
                    currentEmail: currentUser?.email
                });

                if (Object.keys(jsonData).length === 0) {
                    throw new Error('No changes to update');
                }

                requestData = JSON.stringify(jsonData);
                headers['Content-Type'] = 'application/json';
            }

            const response = await AuthManager.fetchWithAuth(
                `${AuthManager.API_BASE}users/profile/`,
                {
                    method: 'PUT',
                    headers,
                    body: requestData
                }
            );

            const responseData = await response.json();
            console.log('Response status:', response.status);
            console.log('Response data:', responseData);

            if (!response.ok) {
                let errorMessage = 'Profile update failed';
                
                if (responseData.detail) {
                    errorMessage = responseData.detail;
                } else if (responseData.username) {
                    errorMessage = `Username: ${responseData.username.join(', ')}`;
                } else if (responseData.email) {
                    errorMessage = `Email: ${responseData.email.join(', ')}`;
                } else if (responseData.password) {
                    errorMessage = `Password: ${responseData.password.join(', ')}`;
                } else if (responseData.avatar) {
                    errorMessage = `Avatar: ${responseData.avatar.join(', ')}`;
                }
                
                throw new Error(errorMessage);
            }

            // Update current user data
            if (responseData.user) {
                AuthManager.currentUser = responseData.user;
                localStorage.setItem('currentUser', JSON.stringify(responseData.user));
            }

            // Clear form and show success message
            document.getElementById('update-profile-form').reset();
            UIManager.showToast('Profile updated successfully!', 'success');

            // Navigate to home page first, then update the UI
            window.location.hash = '#/home';
            
            // Give the router time to load the new page and header
            await new Promise(resolve => setTimeout(resolve, 100));
            
            // Now update the main page content
            await UIManager.loadMainPage();

        } catch (error) {
            console.error('Profile update error:', error);
            UIManager.showToast(error.message || 'Failed to update profile', 'danger');
        }
    }

    static async enable2FA() {
        try {
            const response = await AuthManager.fetchWithAuth(`${AuthManager.API_BASE}auth/2fa/enable/`, {
                method: 'POST'
            });

            if (!response.ok) throw new Error('Failed to enable 2FA');

            const data = await response.json();
            
            // Show QR code modal
            const qrModal = document.createElement('div');
            qrModal.className = 'modal fade';
            qrModal.id = 'qrModal';
            qrModal.innerHTML = `
                <div class="modal-dialog">
                    <div class="modal-content bg-dark text-light">
                        <div class="modal-header">
                            <h5 class="modal-title">Setup 2FA</h5>
                            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body text-center">
                            <p>Scan this QR code with your authenticator app:</p>
                            <img src="${data.qr_code}" alt="2FA QR Code" class="img-fluid mb-3">
                            <p class="mb-3">Or enter this code manually:</p>
                            <code class="bg-secondary p-2">${data.secret_key}</code>
                            <div class="mt-4">
                                <label for="verification_code" class="form-label">Enter verification code to confirm:</label>
                                <input type="text" class="form-control bg-secondary text-light" id="verification_code">
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                            <button type="button" class="btn btn-primary" id="verify2FABtn">Verify</button>
                        </div>
                    </div>
                </div>
            `;

            document.body.appendChild(qrModal);
            const modal = new bootstrap.Modal(qrModal);
            modal.show();

            // Handle verification
            document.getElementById('verify2FABtn').addEventListener('click', async () => {
                const code = document.getElementById('verification_code').value;
                try {
                    const verifyResponse = await AuthManager.fetchWithAuth(`${AuthManager.API_BASE}auth/2fa/verify/`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ code })
                    });

                    if (!verifyResponse.ok) throw new Error('Invalid verification code');

                    modal.hide();
                    qrModal.remove();

                    // Update UI
                    const is2FAEnabled = document.getElementById('is-2fa-enabled');
                    const twoFAToggleBtn = document.getElementById('2fa-toggle-btn');
                    
                    if (is2FAEnabled) is2FAEnabled.textContent = 'Enabled';
                    if (twoFAToggleBtn) twoFAToggleBtn.textContent = 'Disable 2FA';

                    UIManager.showToast('2FA enabled successfully', 'success');
                } catch (error) {
                    UIManager.showToast(error.message || 'Verification failed', 'danger');
                }
            });

            qrModal.addEventListener('hidden.bs.modal', () => {
                qrModal.remove();
            });

        } catch (error) {
            console.error('2FA enable error:', error);
            UIManager.showToast(error.message || 'Failed to enable 2FA', 'danger');
        }
    }

    static async disable2FA() {
        try {
            const response = await AuthManager.fetchWithAuth(`${AuthManager.API_BASE}auth/2fa/disable/`, {
                method: 'POST'
            });

            if (!response.ok) throw new Error('Failed to disable 2FA');

            // Update UI
            const is2FAEnabled = document.getElementById('is-2fa-enabled');
            const twoFAToggleBtn = document.getElementById('2fa-toggle-btn');
            
            if (is2FAEnabled) is2FAEnabled.textContent = 'Disabled';
            if (twoFAToggleBtn) twoFAToggleBtn.textContent = 'Enable 2FA';

            UIManager.showToast('2FA disabled successfully', 'success');
        } catch (error) {
            console.error('2FA disable error:', error);
            UIManager.showToast(error.message || 'Failed to disable 2FA', 'danger');
        }
    }

    static async verify2FA(code) {
        try {
            const username = sessionStorage.getItem('tempUsername');
            const password = sessionStorage.getItem('tempPassword');
            
            if (!username || !password) {
                throw new Error('Missing credentials');
            }

            const response = await fetch(`${AuthManager.API_BASE}auth/2fa/login/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password, code })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Invalid verification code');
            }

            await AuthManager.processSuccessfulAuth(data);
            return true;
        } catch (error) {
            console.error('2FA verification error:', error);
            UIManager.showToast(error.message || 'Verification failed', 'danger');
            return false;
        }
    }
} 