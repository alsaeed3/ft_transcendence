import { AuthManager } from './authManager.js';
import { UIManager } from './uiManager.js';
import { LanguageManager } from './LanguageManager.js';

export class ProfileManager {
    static async fetchUserProfile() {
        try {
            const response = await AuthManager.fetchWithAuth(`${AuthManager.API_BASE}users/me/`);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const profile = await response.json();
            
            // Ensure avatar path is correct
            if (profile.avatar) {
                profile.avatar = profile.avatar.startsWith('/') ? 
                    profile.avatar : `/media/${profile.avatar}`;
            } else {
                profile.avatar = '/media/avatars/default.svg';
            }
            
            return profile;
        } catch (error) {
            console.error('Error fetching profile:', error);
            if (error.message.includes('401')) {
                localStorage.clear();
                AuthManager.accessToken = null;
                UIManager.showPage(UIManager.pages.landing);
            }
            throw error;
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

            // Update 2FA section based on user type
            const twoFAStatus = document.getElementById('2fa-status');
            if (twoFAStatus) {
                if (AuthManager.currentUser.is_42_user) {
                    twoFAStatus.innerHTML = `<p class="text-warning" data-i18n="twoFactor42Message">${LanguageManager.getTranslation('twoFactor42Message')}</p>`;
                } else {
                    // ... existing 2FA status code ...
                }
                // Update translations for the newly added content
                LanguageManager.updateContent();
            }

        } catch (error) {
            console.error('Profile update error:', error);
            UIManager.showToast(error.message || 'Failed to update profile', 'danger');
        }
    }
} 