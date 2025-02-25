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
            const response = await AuthManager.fetchWithAuth(`${AuthManager.API_BASE}users/me/`, {
                method: 'PATCH',
                body: formData
            });

            if (!response.ok) {
                const data = await response.json();
                let errorMessage = '';
                
                // Handle validation errors
                if (data.email) errorMessage += `Email: ${data.email.join(', ')}\n`;
                if (data.username) errorMessage += `Username: ${data.username.join(', ')}\n`;
                if (data.avatar) errorMessage += `Avatar: ${data.avatar.join(', ')}\n`;
                
                if (!errorMessage) errorMessage = 'Profile update failed';
                
                throw new Error(errorMessage);
            }

            const updatedProfile = await response.json();
            
            // Update stored user data
            AuthManager.currentUser = updatedProfile;
            localStorage.setItem('currentUser', JSON.stringify(updatedProfile));

            // Update UI elements
            const usernameDisplay = document.getElementById('username-display');
            const profileAvatar = document.getElementById('profile-avatar');
            const currentAvatarImg = document.getElementById('current-avatar');
            
            if (usernameDisplay) usernameDisplay.textContent = updatedProfile.username;
            if (profileAvatar) profileAvatar.src = updatedProfile.avatar_url;
            if (currentAvatarImg) currentAvatarImg.src = updatedProfile.avatar_url;

            UIManager.showToast('Profile updated successfully', 'success');
            return true;
        } catch (error) {
            console.error('Profile update error:', error);
            UIManager.showToast(error.message || 'Failed to update profile', 'danger');
            return false;
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