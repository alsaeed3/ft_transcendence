// Import all required modules
import { router } from '/src/assets/js/modules/router.js';
import { AuthManager } from '/src/assets/js/modules/authManager.js';
import { UIManager } from '/src/assets/js/modules/uiManager.js';
import { UserManager } from '/src/assets/js/modules/userManager.js';
import { FriendManager } from '/src/assets/js/modules/friendManager.js';
import { ProfileManager } from '/src/assets/js/modules/profileManager.js';
import { ChatManager } from '/src/assets/js/modules/chatManager.js';

// Initialize router
router.init();

// Handle OAuth callback if present
const urlParams = new URLSearchParams(window.location.search);
const code = urlParams.get('code');

if (code) {
    handleOAuthCallback();
} else if (AuthManager.accessToken) {
    // If we already have a token, initialize WebSocket and go to home page
    ChatManager.initStatusWebSocket();
    if (!window.location.hash || window.location.hash === '#/') {
        window.location.hash = '#/home';
    }
} else {
    // Default to login page
    window.location.hash = '#/';
}

// Clean up URL
window.history.replaceState({}, document.title, '/');

// Keep handleOAuthCallback function definition
async function handleOAuthCallback() {
    try {
        const response = await fetch(`${AuthManager.API_BASE}auth/oauth/callback/?code=${code}`);
        const data = await response.json();
        if (response.ok) {
            // Store tokens and redirect to main page
            AuthManager.accessToken = data.access;
            AuthManager.refreshToken = data.refresh;
            localStorage.setItem('accessToken', AuthManager.accessToken);
            localStorage.setItem('refreshToken', AuthManager.refreshToken);
            
            // Clean up URL and redirect to main page
            window.history.replaceState({}, document.title, '/');
            UIManager.showPage(UIManager.pages.home);
        } else {
            throw new Error(data.error || 'OAuth authentication failed');
        }
    } catch (error) {
        console.error('OAuth callback error:', error);
        UIManager.showToast('Authentication failed. Please try again.', 'danger');
        UIManager.showPage(UIManager.pages.login);
    }
}

// Export all managers for use in other modules
export {
    AuthManager,
    UIManager,
    UserManager,
    FriendManager,
    ProfileManager,
    ChatManager
};
