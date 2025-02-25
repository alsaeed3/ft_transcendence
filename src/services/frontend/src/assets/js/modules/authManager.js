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

            // Check for 2FA requirement
            if (data['2fa_required']) {
                sessionStorage.setItem('tempUsername', username);
                if (data.is_2fa_enabled) {
                    sessionStorage.setItem('tempUsername', username);
                    sessionStorage.setItem('tempPassword', password);
                    sessionStorage.setItem('tempUserEmail', data.user.email);
                    
                    document.getElementById('login-form').classList.add('d-none');
                    document.getElementById('2fa-form').classList.remove('d-none');
                    
                    this.startOTPTimer();
                    return;
                }
                sessionStorage.setItem('tempPassword', password);
                sessionStorage.setItem('tempUserEmail', data.user.email);
                
                document.getElementById('login-form').classList.add('d-none');
                document.getElementById('2fa-form').classList.remove('d-none');
                
                this.startOTPTimer();
                return;
            }

            await this.processSuccessfulAuth(data);
        } catch (error) {
            UIManager.showToast(error.message || 'Login failed', 'danger');
        }
    }

    static async processSuccessfulAuth(data) {
        // Store tokens
        this.accessToken = data.access;
        this.refreshToken = data.refresh;
        localStorage.setItem('accessToken', this.accessToken);
        localStorage.setItem('refreshToken', this.refreshToken);

        // Store user data
        this.currentUser = data.user;
        localStorage.setItem('currentUser', JSON.stringify(data.user));

        // Clean up any temporary data
        sessionStorage.removeItem('tempUsername');
        sessionStorage.removeItem('tempPassword');
        sessionStorage.removeItem('tempUserEmail');

        // Initialize WebSocket connection
        ChatManager.cleanup();
        ChatManager.initStatusWebSocket();

        // Redirect to home page
        UIManager.showPage(UIManager.pages.home);
        await UIManager.loadMainPage();
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

                UIManager.showToast(errorMessage.trim(), 'danger');
                return;
            }

            UIManager.showToast('Registration successful! Please log in.', 'success');
            UIManager.toggleForms();
        } catch (error) {
            console.error('Registration error:', error);
            UIManager.showToast('Registration failed. Please try again.', 'danger');
        }
    }

    static logout() {
        // Clear all stored data
        localStorage.clear();
        sessionStorage.clear();
        this.accessToken = null;
        this.refreshToken = null;
        this.currentUser = null;

        // Clean up WebSocket connections
        ChatManager.cleanup();

        // Redirect to login page
        UIManager.showLoginForm();
    }

    static startOTPTimer() {
        let timeLeft = 300; // 5 minutes in seconds
        const timerDisplay = document.getElementById('otp-timer');
        
        if (this.currentOTPTimer) {
            clearInterval(this.currentOTPTimer);
        }
        
        this.currentOTPTimer = setInterval(() => {
            const minutes = Math.floor(timeLeft / 60);
            const seconds = timeLeft % 60;
            
            if (timerDisplay) {
                timerDisplay.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
            }
            
            if (timeLeft <= 0) {
                clearInterval(this.currentOTPTimer);
                this.currentOTPTimer = null;
                UIManager.showLoginForm();
                UIManager.showToast('OTP expired. Please try again.', 'warning');
            }
            
            timeLeft--;
        }, 1000);
    }
} 