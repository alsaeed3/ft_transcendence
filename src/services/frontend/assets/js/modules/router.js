// Import required modules
import { AuthManager } from './authManager.js';
import { UIManager } from './uiManager.js';
import { ChatManager } from './chatManager.js';
import { UserManager } from './userManager.js';
import { FriendManager } from './friendManager.js';
import { ProfileManager } from './profileManager.js';
import { LanguageManager } from '/assets/js/modules/LanguageManager.js';

const router = {
    routes: {},
    currentPage: null,
    currentCleanup: null,  // Add this to track current cleanup function

    async loadComponent(path) {
        try {
            // Clean up previous page if needed
            if (this.currentCleanup) {
                this.currentCleanup();
                this.currentCleanup = null;
            }

            // Close chat if navigating away from home page
            if (!path.includes('home.html')) {
                ChatManager.closeChat();
                
                // Close Friends modal when leaving home page
                const friendsModal = document.getElementById('friendsListModal');
                if (friendsModal) {
                    // Remove modal-specific classes and styles before Bootstrap cleanup
                    friendsModal.classList.remove('show');
                    friendsModal.style.display = 'none';
                    friendsModal.setAttribute('aria-hidden', 'true');
                    friendsModal.removeAttribute('aria-modal');
                    friendsModal.removeAttribute('role');
                    
                    // Clean up modal backdrop and body classes
                    document.body.classList.remove('modal-open');
                    const backdrop = document.querySelector('.modal-backdrop');
                    if (backdrop) backdrop.remove();
                    document.body.style.removeProperty('padding-right');
                    document.body.style.removeProperty('overflow');
                }
            }

            // Close other modals normally
            const modals = [
                'usersListModal',
                'userProfileModal',
                'addFriendModal'
            ];

            modals.forEach(modalId => {
                const modalElement = document.getElementById(modalId);
                if (modalElement) {
                    const modalInstance = bootstrap.Modal.getInstance(modalElement);
                    if (modalInstance) {
                        modalInstance.hide();
                        // Clean up modal backdrop and body classes
                        document.body.classList.remove('modal-open');
                        const backdrop = document.querySelector('.modal-backdrop');
                        if (backdrop) backdrop.remove();
                        document.body.style.removeProperty('padding-right');
                        document.body.style.removeProperty('overflow');
                    }
                }
            });

            const response = await fetch(path);
            if (!response.ok) throw new Error(`Failed to load component: ${path}`);
            return await response.text();
        } catch (error) {
            console.error('Error loading component:', error);
            throw error;
        }
    },

    addRoute(route, config) {
        this.routes[route] = config;
    },

    async checkAuth() {
        const accessToken = localStorage.getItem('accessToken');
        const refreshToken = localStorage.getItem('refreshToken');

        if (accessToken && refreshToken) {
            try {
                await AuthManager.refreshAccessToken();
                return true;
            } catch (error) {
                console.error('Auth check failed:', error);
                localStorage.clear();
                AuthManager.accessToken = null;
                AuthManager.refreshToken = null;
                return false;
            }
        }
        return false;
    },

    async navigate(route = window.location.hash || '#/') {
        // Clean up previous page if needed
        if (this.currentCleanup) {
            this.currentCleanup();
            this.currentCleanup = null;
        }

        // Normalize the route
        route = route || '#/';
        if (route === '#undefined') {
            route = '#/';
        }

        // Check authentication before navigation
        const isAuthenticated = await this.checkAuth();
        
        // If authenticated and trying to access login/root/register, redirect to home
        if (isAuthenticated && (route === '#/' || route === '#/login' || route === '#/register' || !route)) {
            UIManager.showPage(UIManager.pages.home);
            return;
        }
        
        // Special handling for 2FA route
        if (route === '#/2fa') {
            const tempUsername = sessionStorage.getItem('tempUsername');
            const tempPassword = sessionStorage.getItem('tempPassword');
            const tempUserEmail = sessionStorage.getItem('tempUserEmail');
            
            // If any required data is missing, redirect to login
            if (!tempUsername || !tempPassword || !tempUserEmail) {
                UIManager.showToast('Invalid 2FA access. Please login/relogin first.', 'warning');
                UIManager.showLoginForm();
                return;
            }
        }
        
        // If not authenticated and trying to access protected routes, redirect to login
        if (!isAuthenticated && route !== '#/' && route !== '#/register' && route !== '#/2fa') {
            UIManager.showLoginForm();
            return;
        }

        const config = this.routes[route];
        if (!config) {
            UIManager.showLoginForm();
            return;
        }

        try {
            const container = document.getElementById('pages-container');
            if (!container) {
                throw new Error('Pages container not found');
            }

            // Handle routes with no component differently
            if (config.component === null) {
                // Clear the container but don't try to load a component
                container.innerHTML = '';
            } else {
                // Load and display the component
                const content = await this.loadComponent(config.component);
                container.innerHTML = content;
            }

            // Update header visibility - only show on home page
            const header = document.getElementById('header');
            if (header) {
                if (route === '#/home') {
                    const headerContent = await this.loadComponent('/assets/components/header.html');
                    header.innerHTML = headerContent;
                    header.style.display = 'block';
                    
                    // Wait for header elements to be available
                    await new Promise(resolve => {
                        const checkElements = () => {
                            const usernameDisplay = document.getElementById('username-display');
                            const profileAvatar = document.getElementById('profile-avatar');
                            if (usernameDisplay && profileAvatar) {
                                resolve();
                            } else {
                                setTimeout(checkElements, 50);
                            }
                        };
                        checkElements();
                    });
                    
                    this.bindHeaderEvents();
        } else {
                    header.innerHTML = '';
                    header.style.display = 'none';
                }
            }

            // Execute any initialization code and store cleanup if returned
            if (config.init) {
                const cleanup = await config.init();
                if (typeof cleanup === 'function') {
                    this.currentCleanup = cleanup;
                }
            }

            // Bind component-specific events
            if (config.bindEvents) {
                config.bindEvents();
            }

            this.currentPage = route;
        } catch (error) {
            console.error('Navigation error:', error);
            if (route !== '#/') {
                UIManager.showLoginForm();
            }
        }
    },

    bindHeaderEvents() {
        // Bind header-specific events
        const userProfile = document.getElementById('user-profile');
        const logoutBtn = document.getElementById('logout-btn');
        const showUsersBtn = document.getElementById('show-users-btn');
        const showFriendsBtn = document.getElementById('show-friends-btn');

        if (userProfile) {
            userProfile.addEventListener('click', async () => {
                UIManager.showPage(UIManager.pages.profile);
            });
        }

        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => AuthManager.logout());
        }

        // Initialize managers if not already initialized
        if (typeof UserManager !== 'undefined' && !UserManager.usersModal) {
            UserManager.initializeEventListeners();
        }
        if (typeof FriendManager !== 'undefined' && !FriendManager.friendsModal) {
            FriendManager.initializeEventListeners();
        }

        // Let the managers handle the click events
        if (showUsersBtn) {
            showUsersBtn.addEventListener('click', () => {
                const usersModal = new bootstrap.Modal(document.getElementById('usersListModal'));
                usersModal.show();
            });
        }

        if (showFriendsBtn) {
            showFriendsBtn.addEventListener('click', () => {
                const friendsModal = new bootstrap.Modal(document.getElementById('friendsListModal'));
                friendsModal.show();
            });
        }

        // Add language selector handling
        const languageSelect = document.getElementById('language-select');
        if (languageSelect) {
            // Set initial value
            languageSelect.value = LanguageManager.currentLanguage || 'en';
            
            languageSelect.addEventListener('change', (e) => {
                LanguageManager.setLanguage(e.target.value);
            });
        }
    },

    init() {
        // Define routes
        this.addRoute('#/', {
            component: '/assets/components/login.html',
            bindEvents: () => {
                const loginForm = document.getElementById('login-form');
                const registerLink = document.getElementById('register-link');
                const oauth42Btn = document.getElementById('oauth-42-btn');

                if (loginForm) {
                    loginForm.addEventListener('submit', async (e) => {
                        e.preventDefault();
                        
                        const [username, password] = e.target.querySelectorAll('input');
                        
                        try {
                            const loginResponse = await fetch(`${AuthManager.API_BASE}auth/login/`, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                    username: username.value,
                                    password: password.value
                                })
                            });

                            if (!loginResponse.ok) {
                                const errorData = await loginResponse.json();
                                throw new Error(errorData.error || `Login failed: ${loginResponse.statusText}`);
                            }

                            const response = await loginResponse.json();
                            
                            // Handle 2FA if required
                            if (response['2fa_required']) {
                                sessionStorage.setItem('tempUsername', username.value);
                                sessionStorage.setItem('tempPassword', password.value);
                                sessionStorage.setItem('tempUserEmail', response.user.email);
                                UIManager.showPage(UIManager.pages.twoFactor);
                                return;
                            }

                            // Handle successful login
                            if (response.access) {
                                // Set tokens in AuthManager first
                                AuthManager.accessToken = response.access;
                                AuthManager.refreshToken = response.refresh;
                                
                                // Then store in localStorage
                                localStorage.setItem('accessToken', response.access);
                                localStorage.setItem('refreshToken', response.refresh);
                                
                                if (response.user) {
                                    AuthManager.currentUser = response.user;
                                    localStorage.setItem('currentUser', JSON.stringify(response.user));
                                }

                                // Initialize WebSocket connection with new token
                                if (typeof ChatManager !== 'undefined') {
                                    ChatManager.cleanup();
                                    ChatManager.initStatusWebSocket();
                                }

                                // Navigate to home page
                                UIManager.showPage(UIManager.pages.home);
                                return;
                            }
                            
                            UIManager.showToast('Unexpected login response', 'danger');
                        } catch (error) {
                            console.error('Login error:', error);
                            UIManager.showToast(error.message || 'Login failed', 'danger');
                        }
                    });
                } else {
                    console.error('Login form not found in DOM');
                    console.log('Current DOM state:', {
                        body: document.body.innerHTML,
                        loginFormQuery: document.querySelector('#login-form'),
                        allForms: document.querySelectorAll('form')
                    });
                }

                if (registerLink) {
                    registerLink.addEventListener('click', (e) => {
                        e.preventDefault();
                        UIManager.toggleForms();
                    });
                }

                if (oauth42Btn) {
                    oauth42Btn.addEventListener('click', (e) => {
                        e.preventDefault();
                        sessionStorage.setItem('preAuthPath', window.location.pathname);
                        window.location.href = `${AuthManager.API_BASE}auth/oauth/login/`;
                    });
                }
            }
        });

        this.addRoute('#/register', {
            component: '/assets/components/register.html',
            bindEvents: () => {
                const registerForm = document.getElementById('register-form');
                const loginLink = document.getElementById('login-link');

                if (registerForm) {
                    registerForm.addEventListener('submit', async (e) => {
                        e.preventDefault();
                        const inputs = e.target.querySelectorAll('input');
                        const userData = {
                            username: inputs[0].value,
                            email: inputs[1].value,
                            password: inputs[2].value,
                            repeat_password: inputs[3].value
                        };
                        await AuthManager.register(userData);
                    });
                }

                if (loginLink) {
                    loginLink.addEventListener('click', (e) => {
                        e.preventDefault();
                        UIManager.toggleForms();
                    });
                }
            }
        });

        this.addRoute('#/2fa', {
            component: '/assets/components/2fa.html',
            init: async () => {
                if (typeof AuthManager.startOTPTimer === 'function') {
                    AuthManager.startOTPTimer();
                }
            },
            bindEvents: () => {
                const twoFAForm = document.getElementById('2fa-form');
                const backToLoginBtn = document.getElementById('back-to-login');
                const otpInput = document.getElementById('otp-input');

                if (twoFAForm) {
                    twoFAForm.addEventListener('submit', async (e) => {
                        e.preventDefault();
                        
                        const otp = otpInput.value.trim();
                        if (otp.length !== 6) {
                            UIManager.showToast('Please enter the 6-digit verification code.', 'warning');
                            return;
                        }

                        try {
                            const response = await AuthManager.verify2FA(otp);

                            if (response && response.access) {
                                // Clear temporary storage
                                sessionStorage.removeItem('tempUsername');
                                sessionStorage.removeItem('tempPassword');
                                sessionStorage.removeItem('tempUserEmail');
                                
                                // Navigate to home page
                                UIManager.showPage(UIManager.pages.home);
                            }
                        } catch (error) {
                            UIManager.showToast(error.message || 'Failed to verify code', 'danger');
                        }
                    });
                }

                if (backToLoginBtn) {
                    backToLoginBtn.addEventListener('click', () => {
                        // Clear temporary storage
                        sessionStorage.removeItem('tempUsername');
                        sessionStorage.removeItem('tempPassword');
                        sessionStorage.removeItem('tempUserEmail');
                        UIManager.showLoginForm();
                    });
                }

                if (otpInput) {
                    otpInput.addEventListener('input', (e) => {
                        e.target.value = e.target.value.replace(/[^0-9]/g, '').slice(0, 6);
                    });
                }
            }
        });

        this.addRoute('#/home', {
            component: '/assets/components/home.html',
            init: async () => {
                await UIManager.loadMainPage();
                // Initialize managers
                if (typeof UserManager !== 'undefined') {
                    UserManager.initializeEventListeners();
                }
                if (typeof FriendManager !== 'undefined') {
                    FriendManager.initializeEventListeners();
                }
            },
            bindEvents: () => {
                const playPlayerBtn = document.getElementById('play-player-btn');
                const playAIBtn = document.getElementById('play-ai-btn');
                const createTournamentBtn = document.getElementById('create-tournament-btn');
                const playTerritoryBtn = document.getElementById('play-territory-btn');
                const play4PlayerBtn = document.getElementById('play-4player-btn');

                if (playPlayerBtn) {
                    playPlayerBtn.addEventListener('click', async () => {
                        if (!AuthManager.accessToken) {
                            UIManager.showLoginForm();
                            return;
                        }
                        UIManager.showPage(UIManager.pages.playerSetup);
                    });
                }

                if (playAIBtn) {
                    playAIBtn.addEventListener('click', async () => {
                        if (!AuthManager.accessToken) {
                            UIManager.showLoginForm();
                            return;
                        }
                        UIManager.showPage(UIManager.pages.pongAI);
                    });
                }

                if (createTournamentBtn) {
                    createTournamentBtn.addEventListener('click', async () => {
                        if (!AuthManager.accessToken) {
                            UIManager.showLoginForm();
                            return;
                        }
                        UIManager.showPage(UIManager.pages.tournamentSetup);
                    });
                }

                if (playTerritoryBtn) {
                    playTerritoryBtn.addEventListener('click', async () => {
                        if (!AuthManager.accessToken) {
                            UIManager.showLoginForm();
                            return;
                        }
                        UIManager.showPage(UIManager.pages.territory);
                    });
                }

                if (play4PlayerBtn) {
                    play4PlayerBtn.addEventListener('click', async () => {
                        if (!AuthManager.accessToken) {
                            UIManager.showLoginForm();
                            return;
                        }
                        UIManager.showPage(UIManager.pages.pong4Player);
                    });
                }
            }
        });

        this.addRoute('#/profile', {
            component: '/assets/components/profile.html',
            init: async () => {
                await UIManager.loadUpdateProfilePage();
            },
            bindEvents: () => {
                const updateProfileForm = document.getElementById('update-profile-form');
                const backToMainBtn = document.getElementById('back-to-main');
                const twoFAToggleForm = document.getElementById('2fa-toggle-form');

                if (updateProfileForm) {
                    updateProfileForm.addEventListener('submit', async (e) => {
                        e.preventDefault();
                        const formData = new FormData(e.target);
                        await ProfileManager.updateProfile(formData);
                    });
                }

                if (backToMainBtn) {
                    backToMainBtn.addEventListener('click', (e) => {
                        e.preventDefault();
                        UIManager.showPage(UIManager.pages.home);
                    });
                }

                if (twoFAToggleForm) {
                    twoFAToggleForm.addEventListener('submit', async (e) => {
                        e.preventDefault();
                        const password = document.getElementById('2fa-password').value;
                        try {
                            const profile = await ProfileManager.fetchUserProfile();
                            if (profile.is_42_auth) {
                                UIManager.showToast('2FA settings cannot be modified for 42 School users.', 'warning');
                                return;
                            }

                            const response = await AuthManager.fetchWithAuth(`${AuthManager.API_BASE}auth/2fa/toggle/`, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ password })
                            });

                            if (!response.ok) {
                                const errorData = await response.json();
                                throw new Error(errorData.error || 'Failed to toggle 2FA');
                            }

                            const data = await response.json();
                            document.getElementById('2fa-password').value = '';
                            await UIManager.loadUpdateProfilePage();
                            UIManager.showToast(data.message || '2FA status updated successfully', 'success');
                        } catch (error) {
                            console.error('Error toggling 2FA:', error);
                            UIManager.showToast(error.message, 'danger');
                        }
                    });
                }
            }
        });

        this.addRoute('#/player-setup', {
            component: '/assets/components/player2-setup.html',
            bindEvents: () => {
                const setupForm = document.getElementById('player2-setup-form');
                const cancelBtn = document.getElementById('cancel-btn');

                if (setupForm) {
                    setupForm.addEventListener('submit', async (e) => {
                        e.preventDefault();
                        const player2Name = document.getElementById('player2-name').value;
                        localStorage.setItem('player2Name', player2Name);
                        UIManager.showPage(UIManager.pages.pongPVP);
                    });
                }

                if (cancelBtn) {
                    cancelBtn.addEventListener('click', () => {
                        UIManager.showPage(UIManager.pages.home);
                    });
                }
            }
        });

        this.addRoute('#/pong/pvp', {
            component: '/assets/components/pong.html',
            init: async () => {
                // Load pong.js script if not already loaded
                if (!window.initGame) {
                    await new Promise((resolve, reject) => {
                        const script = document.createElement('script');
                        script.src = '/assets/js/pong.js';
                        script.onload = resolve;
                        script.onerror = reject;
                        document.body.appendChild(script);
                    });
                }
                // Wait for next frame to ensure canvas is ready
                requestAnimationFrame(() => {
                    if (typeof initGame === 'function') {
                        initGame('PVP');
                    }
                });
            }
        });

        this.addRoute('#/pong/ai', {
            component: '/assets/components/pong.html',
            init: async () => {
                // Load pong.js script if not already loaded
                if (!window.initGame) {
                    await new Promise((resolve, reject) => {
                        const script = document.createElement('script');
                        script.src = '/assets/js/pong.js';
                        script.onload = resolve;
                        script.onerror = reject;
                        document.body.appendChild(script);
                    });
                }
                // Wait for next frame to ensure canvas is ready
                requestAnimationFrame(() => {
                    if (typeof initGame === 'function') {
                        initGame('AI');
                    }
                });
            }
        });

        this.addRoute('#/pong/tournament', {
            component: '/assets/components/pong.html',
            init: async () => {
                // Load pong.js script if not already loaded
                if (!window.initGame) {
                    await new Promise((resolve, reject) => {
                        const script = document.createElement('script');
                        script.src = '/assets/js/pong.js';
                        script.onload = resolve;
                        script.onerror = reject;
                        document.body.appendChild(script);
                    });
                }
                // Wait for next frame to ensure canvas is ready
                requestAnimationFrame(() => {
                    if (typeof initGame === 'function') {
                        initGame('TOURNAMENT');
                    }
                });
            }
        });

        this.addRoute('#/tournament-setup', {
            component: '/assets/components/tournament-setup.html',
            bindEvents: () => {
                const setupForm = document.getElementById('tournamentForm');
                const cancelBtn = document.getElementById('cancelBtn');
                const playerCountBtns = document.querySelectorAll('.player-count-btn');

                function selectPlayers(count) {
                    const inputsContainer = document.getElementById('playerInputs');
                    playerCountBtns.forEach(btn => {
                        btn.classList.toggle('active', parseInt(btn.dataset.count) === count);
                    });
                    
                    inputsContainer.innerHTML = '';
                    
                    for (let i = 2; i <= count; i++) {
                        const div = document.createElement('div');
                        div.className = 'mb-3';
                        div.innerHTML = `
                            <label for="player${i}" class="form-label">Player ${i} Nickname</label>
                            <input type="text" class="form-control" id="player${i}" name="player${i}" required>
                        `;
                        inputsContainer.appendChild(div);
                    }
                }

                // Initialize with 4 players
                selectPlayers(4);

                playerCountBtns.forEach(button => {
                    button.addEventListener('click', () => selectPlayers(parseInt(button.dataset.count)));
                });

                if (setupForm) {
                    setupForm.addEventListener('submit', async (e) => {
                        e.preventDefault();
                        
                        const inputs = [
                            document.getElementById('currentPlayer'),
                            ...document.querySelectorAll('#playerInputs input')
                        ];
                        const players = [];
                        let hasError = false;
                        const errorMessages = new Set();

                        inputs.forEach(input => {
                            const nickname = input.value.trim();
                            
                            if (!nickname || nickname.length > 8 || !/^[a-zA-Z0-9]+$/.test(nickname) || players.includes(nickname)) {
                                hasError = true;
                                input.classList.add('is-invalid');
                                if (!nickname) errorMessages.add('All player nicknames are required');
                                if (nickname.length > 8) errorMessages.add('Nicknames must be 8 characters or less');
                                if (!/^[a-zA-Z0-9]+$/.test(nickname)) errorMessages.add('Nicknames can only contain letters and numbers');
                                if (players.includes(nickname)) errorMessages.add('Each player must have a unique nickname');
                                return;
                            }
                            
                            input.classList.remove('is-invalid');
                            players.push(nickname);
                        });

                        if (hasError) {
                            const alert = document.createElement('div');
                            alert.className = 'alert alert-danger mt-3';
                            alert.innerHTML = `<ul class="mb-0">${[...errorMessages].map(msg => `<li>${msg}</li>`).join('')}</ul>`;
                            const existingAlert = document.querySelector('.alert');
                            if (existingAlert) existingAlert.remove();
                            setupForm.insertBefore(alert, setupForm.firstChild);
                            return;
                        }

                        localStorage.setItem('tournamentPlayers', JSON.stringify(players));
                        UIManager.showPage(UIManager.pages.pongTournament);
                    });
                }

                if (cancelBtn) {
                    cancelBtn.addEventListener('click', () => {
                        UIManager.showPage(UIManager.pages.home);
                    });
                }
            }
        });

        this.addRoute('#/territory', {
            component: '/assets/components/territory.html',
            init: async () => {
                // Load territory.js script as a module
                const { initTerritory } = await import('/assets/js/territory.js');
                
                // Initialize game after module is loaded
                initTerritory();
            }
        });

        this.addRoute('#/pong4', {
            component: null,
            init: async () => {
                // Create container for 4-player Pong
                const container = document.createElement('div');
                container.id = 'pong-page';
                container.className = 'container-fluid p-0 position-relative';
                document.getElementById('pages-container').appendChild(container);
                
                // Initialize 4-player game
                const cleanup = window.init4PlayerGame();
                return cleanup;
            }
        });

        // Handle navigation events
        window.addEventListener('hashchange', () => this.navigate());
        
        // Initial navigation with session check
        this.checkSessionAndNavigate();
    },

    async checkSessionAndNavigate() {
        try {
            // Check if we have tokens
            const accessToken = localStorage.getItem('accessToken');
            const refreshToken = localStorage.getItem('refreshToken');

            if (accessToken && refreshToken) {
                // Set the tokens in AuthManager
                AuthManager.accessToken = accessToken;
                AuthManager.refreshToken = refreshToken;

                try {
                    // Try to refresh the token
                    await AuthManager.refreshAccessToken();
                    
                    // If we have valid tokens and we're at login/root, redirect to home
                    if (!window.location.hash || window.location.hash === '#/' || window.location.hash === '#/login') {
                        UIManager.showPage(UIManager.pages.home);
                        return;
                    }

                    // For all other routes, proceed with navigation
                    await this.navigate(window.location.hash);
                } catch (error) {
                    console.error('Session validation failed:', error);
                    // Clear tokens and redirect to login only if we're not already there
                    localStorage.clear();
                    AuthManager.accessToken = null;
                    AuthManager.refreshToken = null;
                    if (window.location.hash !== '#/') {
                        UIManager.showLoginForm();
                    } else {
                        await this.navigate('#/');
                    }
                }
            } else if (window.location.hash !== '#/' && window.location.hash !== '#/register') {
                // No tokens and not on login/register page, redirect to login
                UIManager.showLoginForm();
                return;
            } else {
                // We're on login or register with no tokens, proceed normally
                await this.navigate(window.location.hash);
            }
        } catch (error) {
            console.error('Session check failed:', error);
            await this.navigate('#/');
        }
    }
};

// Export the router instance
export { router };

// Also make it available globally for non-module scripts
window.router = router;