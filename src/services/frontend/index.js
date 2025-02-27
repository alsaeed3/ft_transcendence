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

// Handle OAuth parameters if present
const urlParams = new URLSearchParams(window.location.search);
const accessToken = urlParams.get('access_token');
const refreshToken = urlParams.get('refresh_token');
const authError = urlParams.get('auth_error');

if (accessToken && refreshToken) {
    handleOAuthSuccess(accessToken, refreshToken);
} else if (authError) {
    handleOAuthError(authError);
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

async function handleOAuthSuccess(accessToken, refreshToken) {
    try {
        // Store tokens
        AuthManager.accessToken = accessToken;
        AuthManager.refreshToken = refreshToken;
        localStorage.setItem('accessToken', accessToken);
        localStorage.setItem('refreshToken', refreshToken);

        // Fetch user data
        const response = await AuthManager.fetchWithAuth(`${AuthManager.API_BASE}users/me/`);
        if (!response.ok) throw new Error('Failed to fetch user data');
        
        const userData = await response.json();
        AuthManager.currentUser = userData;
        localStorage.setItem('currentUser', JSON.stringify(userData));

        // Initialize WebSocket connection
        ChatManager.cleanup();
        ChatManager.initStatusWebSocket();

        // Add event listeners for users and friends buttons
        const showUsersBtn = document.getElementById('show-users-btn');
        if (showUsersBtn) {
            showUsersBtn.addEventListener('click', async () => {
                await UserManager.refreshUsersList();
                const usersModal = new bootstrap.Modal(document.getElementById('usersListModal'));
                usersModal.show();
            });
        }

        // Clean up URL parameters
        window.history.replaceState({}, document.title, '/');

        // Redirect to home page
        UIManager.showPage(UIManager.pages.home);
        await UIManager.loadMainPage();

    } catch (error) {
        console.error('OAuth success handling error:', error);
        handleOAuthError('Failed to complete authentication');
    }
}

function handleOAuthError(error) {
    // Clean up URL parameters
    window.history.replaceState({}, document.title, '/');
    
    // Show error message and redirect to login
    UIManager.showToast(decodeURIComponent(error), 'danger');
    UIManager.showPage(UIManager.pages.login);
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
