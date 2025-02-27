import { UIManager } from './uiManager.js';
import { ChatManager } from './chatManager.js';

export class AuthManager {
    static username;
    static API_BASE = 'https://localhost/api/';
    static RECENT_MATCHES_LIMIT = 3;
    static TOKEN_REFRESH_THRESHOLD = 30 * 60 * 1000; // 30 minutes in milliseconds
    static currentOTPTimer = null; // For tracking OTP timer
    static accessToken = localStorage.getItem('accessToken');
    static refreshToken = localStorage.getItem('refreshToken');
    static currentUser = null;

    static {
        // Initialize currentUser from localStorage if available
        const storedUser = localStorage.getItem('currentUser');
        if (storedUser) {
            try {
                this.currentUser = JSON.parse(storedUser);
            } catch (e) {
                console.error('Error parsing stored user data:', e);
                localStorage.removeItem('currentUser');
            }
        }
    }

    static async refreshAccessToken() {
        try {
            // Check if we have both tokens
            if (!this.accessToken || !this.refreshToken) {
                throw new Error("Missing tokens");
            }

            // Decode the access token to check expiration
            try {
                const payload = JSON.parse(atob(this.accessToken.split('.')[1]));
                const timeUntilExpiry = payload.exp * 1000 - Date.now();
                
                // If token is still valid for more than the threshold, return it
                if (timeUntilExpiry > this.TOKEN_REFRESH_THRESHOLD) {
                    return this.accessToken;
                }
            } catch (e) {
                console.error('Error decoding token:', e);
                // Continue to refresh if we can't decode the token
            }
    
            // Attempt to refresh the token
            const response = await fetch(`${AuthManager.API_BASE}token/refresh/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ refresh: this.refreshToken })
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                console.error("Token refresh response error:", errorData);
                
                // Clear tokens and redirect only if the refresh token is invalid
                if (response.status === 401) {
                    localStorage.clear();
                    this.accessToken = null;
                    this.refreshToken = null;
                    UIManager.showPage(UIManager.pages.login);
                    throw new Error('Session expired');
                }
                
                throw new Error(`Token refresh failed: ${errorData.error || response.statusText}`);
            }
            
            const data = await response.json();
            this.accessToken = data.access;
            localStorage.setItem('accessToken', this.accessToken);
            return this.accessToken;
        } catch (error) {
            console.error('Token refresh failed:', error);
            throw error;
        }
    }

    static async fetchWithAuth(url, options = {}) {
        try {
            if (!this.accessToken) {
                throw new Error('No access token available');
            }
    
            let response = await fetch(url, {
                ...options,
                headers: {
                    ...options.headers,
                    'Authorization': `Bearer ${this.accessToken}`
                }
            });
    
            if (response.status === 401) {
                try {
                    const newToken = await this.refreshAccessToken();
                    response = await fetch(url, {
                        ...options,
                        headers: {
                            ...options.headers,
                            'Authorization': `Bearer ${newToken}`
                        }
                    });
                } catch (error) {
                    console.error('Token refresh failed:', error);
                    this.logout();
                    throw new Error('Session expired. Please login again.');
                }
            }

            if (response.status === 502) {
                console.error('Backend server error (502)');
                throw new Error('Server temporarily unavailable. Please try again later.');
            }
    
            return response;
        } catch (error) {
            console.error('Fetch error:', error);
            throw error;
        }
    }

    static async login(username, password) {
        try {
            const response = await fetch(`${this.API_BASE}auth/login/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });
            
            const data = await response.json();

            if (!response.ok) {
                UIManager.showToast(data.error || 'Login failed', 'danger');
                return;
            }

            // Check for 2FA requirement (changed from is_2fa_enabled to 2fa_required)
            if (data['2fa_required']) {
                sessionStorage.setItem('tempUsername', username);
                if (data.is_2fa_enabled) {
                    sessionStorage.setItem('tempUsername', username);
                    sessionStorage.setItem('tempPassword', password);
                    sessionStorage.setItem('tempUserEmail', data.user.email);
                    
                    document.getElementById('login-form').classList.add('d-none');
                    document.getElementById('2fa-form').classList.remove('d-none');
                    
                    AuthManager.startOTPTimer();
                    return;
                }
                sessionStorage.setItem('tempPassword', password);
                sessionStorage.setItem('tempUserEmail', data.user.email);
                
                document.getElementById('login-form').classList.add('d-none');
                document.getElementById('2fa-form').classList.remove('d-none');
                
                AuthManager.startOTPTimer();
                return;
            }

            await this.processSuccessfulAuth(data);
        } catch (error) {
            UIManager.showToast(error.message || 'Login failed', 'danger');
        }
    }

    static async register(userData) {
        try {
            // Convert email to lowercase before sending
            if (userData.email) {
                userData.email = userData.email.toLowerCase();
            }

            const response = await fetch(`${this.API_BASE}auth/register/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(userData)
            });

            const data = await response.json();

            if (!response.ok) {
                if (data.error === 'Email is already in use') {
                    UIManager.showToast(data.error, 'danger');
                    return;
                }
                let errorMessage = '';
                
                // Handle each possible error field
                const errorFields = ['username', 'email', 'password', 'repeat_password'];
                errorFields.forEach(field => {
                    if (data[field]) {
                        errorMessage += `${field.charAt(0).toUpperCase() + field.slice(1)}: ${data[field].join('\n')}\n`;
                    }
                });

                // Handle generic error message
                if (data.detail) {
                    errorMessage += data.detail;
                }

                // If no specific error message was found, use a generic one
                if (!errorMessage) {
                    errorMessage = 'Registration failed. Please try again.';
                }

                throw new Error(errorMessage.trim());
            }

            // Show success message and return to login form
            UIManager.showToast('Registration successful! Please login.', 'success');
            UIManager.toggleForms();
        } catch (error) {
            const errorLines = error.message.split('\n');
            const formattedError = errorLines.join('\n');
            UIManager.showToast(formattedError, 'danger');
        }
    }

    static async verify2FA(otp) {
        try {
            const email = sessionStorage.getItem('tempUserEmail');
            const username = sessionStorage.getItem('tempUsername');
            const password = sessionStorage.getItem('tempPassword');
            
            if (!email || !username || !password) {
                throw new Error('Session expired. Please login again.');
            }

            const response = await fetch(`${this.API_BASE}auth/2fa/verify/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, otp, username, password })
            });

            const data = await response.json();

            if (!response.ok) {
                // Show remaining attempts if available
                if (data.remaining_attempts !== undefined) {
                    if (data.remaining_attempts === 0) {
                        UIManager.showToast('Too many failed attempts. Please wait 5 minutes.', 'danger');
                        // Optionally return to login form
                        UIManager.showLoginForm();
                    } else {
                        UIManager.showToast(`Invalid code. ${data.remaining_attempts} attempts remaining.`, 'warning');
                    }
                } else {
                    UIManager.showToast(data.error || 'Invalid or expired OTP', 'danger');
                }
                return;
            }

            // Success - clear storage and process auth
            sessionStorage.removeItem('tempUserEmail');
            sessionStorage.removeItem('tempUsername');
            sessionStorage.removeItem('tempPassword');
            await this.processSuccessfulAuth(data);

        } catch (error) {
            console.error('2FA verification error:', error);
            UIManager.showToast(error.message, 'danger');
        }
    }

    static async processSuccessfulAuth(data) {
        try {
        // Check the structure of data
        console.log('Auth data received:', data);  // Debug log
        
        // Handle both standard login and OAuth flows
        const access = data.access || data.access_token;
        const refresh = data.refresh || data.refresh_token;
        
        if (!access || !refresh) {
            console.error('Invalid auth data:', data);  // Debug log
            throw new Error('Invalid authentication response');
        }
        
            this.accessToken = access;
            this.refreshToken = refresh;
        
        // Ensure we have the complete user object with ID
        if (!data.user || !data.user.id) {
            // Fetch user profile if not provided in auth response
            const profileResponse = await this.fetchWithAuth(`${this.API_BASE}users/me/`);
            if (!profileResponse.ok) {
                throw new Error('Failed to fetch user profile');
            }
            this.currentUser = await profileResponse.json();
        } else {
            this.currentUser = data.user;
        }

        // Store tokens and user data
        localStorage.setItem('accessToken', this.accessToken);
        localStorage.setItem('refreshToken', this.refreshToken);
        localStorage.setItem('currentUser', JSON.stringify(this.currentUser));

        // Clear temporary storage
        sessionStorage.removeItem('tempUsername');
        sessionStorage.removeItem('tempPassword');
        sessionStorage.removeItem('tempUserEmail');
        
            // Initialize WebSocket connection with the new token
            ChatManager.cleanup(); // Clean up any existing connections
            ChatManager.initStatusWebSocket(); // Initialize with new token

            // Navigate to home page and ensure it's loaded
            window.location.hash = '#/home';
            await UIManager.loadMainPage();
        } catch (error) {
            console.error('Error during auth processing:', error);
            UIManager.showToast('Authentication failed', 'danger');
            window.location.hash = '#/';
        }
    }

    static async logout() {
        try {
            if (this.accessToken && this.refreshToken) {
                await this.fetchWithAuth(`${this.API_BASE}auth/logout/`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ refresh: this.refreshToken }),
                });
            }
        } catch (error) {
            console.error('Logout error:', error);
        } finally {
            // Clean up all resources
            ChatManager.cleanup();
            localStorage.clear();
            sessionStorage.clear();
            this.accessToken = null;
            this.refreshToken = null;
            this.currentUser = null;

            // Navigate to login page
            window.location.hash = '#/';
        }
    }

    static startOTPTimer() {
        if (this.currentOTPTimer) {
            clearInterval(this.currentOTPTimer);
        }

        const timerElement = document.getElementById('otp-timer');
        let timeLeft = 300;

        this.currentOTPTimer = setInterval(() => {
            const minutes = Math.floor(timeLeft / 60);
            const seconds = timeLeft % 60;
            timerElement.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
            
            if (timeLeft <= 0) {
                clearInterval(this.currentOTPTimer);
                this.currentOTPTimer = null;
                UIManager.showToast('OTP expired. Please try again.', 'warning');
                UIManager.showLoginForm();
            }
            timeLeft--;
        }, 1000);
    }

    static async fetchMatchHistory() {
        try {
            if (!AuthManager.currentUser?.id) {
                console.log('No current user ID available');
                return [];
            }
            
            const url = `${AuthManager.API_BASE}matches/history/${AuthManager.currentUser.id}/`;
            const response = await AuthManager.fetchWithAuth(url);
            
            if (!response.ok) {
                if (response.status === 404) {
                    return [];
                }
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const matches = await response.json();
            return matches.sort((a, b) => {
                const dateA = new Date(a.end_time || a.start_time);
                const dateB = new Date(b.end_time || b.start_time);
                return dateB - dateA;
            });
        } catch (error) {
            console.error('Error fetching matches:', error);
            return [];
        }
    }
} 