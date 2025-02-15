class AuthManager {

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
            // Check if we have a valid token that doesn't need refresh yet
            if (this.accessToken && this.refreshToken) {
                const payload = JSON.parse(atob(this.accessToken.split('.')[1]));
                const timeUntilExpiry = payload.exp * 1000 - Date.now();
                
                if (timeUntilExpiry > this.TOKEN_REFRESH_THRESHOLD) {
                    return this.accessToken;
                }
            }
    
            if (!this.refreshToken) {
                throw new Error("No refresh token available");
            }
    
            const response = await fetch(`${AuthManager.API_BASE}token/refresh/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ refresh: this.refreshToken })
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                console.error("Token refresh response error:", errorData);
                throw new Error(`Token refresh failed: ${errorData.error || response.statusText}`);
            }
            
            const data = await response.json();
            this.accessToken = data.access;
            localStorage.setItem('accessToken', this.accessToken);
            return this.accessToken;
        } catch (error) {
            console.error('Token refresh failed:', error);
            localStorage.clear();
            UIManager.showPage(UIManager.pages.landing);
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

            // Check specifically for 2FA requirement
            if (response.status === 202 && data['2fa_required']) {
                // Store username for OTP verification
                sessionStorage.setItem('tempUsername', username);
                sessionStorage.setItem('tempPassword', password);
                sessionStorage.setItem('tempUserEmail', data.user.email);
                // Switch to 2FA form
                document.getElementById('login-form').classList.add('d-none');
                document.getElementById('register-form').classList.add('d-none');
                document.getElementById('2fa-form').classList.remove('d-none');
                this.startOTPTimer();
                return;
            }

            if (!response.ok) {
                throw new Error(data.error || 'Login failed');
            }

            // Only store tokens and proceed if no 2FA required
            await this.processSuccessfulAuth(data);
        } catch (error) {
            console.error('Login error:', error);
            UIManager.showToast(error.message, 'danger');
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
                throw new Error(data.error || 'Invalid or expired OTP');
            }

            // Clear temporary storage before processing auth
            sessionStorage.removeItem('tempUserEmail');
            sessionStorage.removeItem('tempUsername');
            sessionStorage.removeItem('tempPassword');

            await this.processSuccessfulAuth(data);
        } catch (error) {
            console.error('2FA verification error:', error);
            UIManager.showToast(error.message, 'danger');
            // On error, return to login form
            UIManager.showLoginForm();
        }
    }

    static async processSuccessfulAuth(data) {
        if (!data.access || !data.refresh) {
            throw new Error('Invalid authentication response');
        }
        
        this.accessToken = data.access;
        this.refreshToken = data.refresh;
        
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
        
        UIManager.showPage(UIManager.pages.main);
        await UIManager.loadMainPage();
    }

    static async logout() {
        try {
            if (this.accessToken && this.refreshToken) {
                await this.fetchWithAuth(`${this.API_BASE}auth/logout/`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ refresh: this.refreshToken })
                });
            }
        } catch (error) {
            console.error('Logout error:', error);
        } finally {
            ChatManager.cleanup();
            localStorage.clear();
            sessionStorage.removeItem('tempUserEmail');
            sessionStorage.removeItem('tempUsername');
            sessionStorage.removeItem('tempPassword');
            this.accessToken = null;
            this.refreshToken = null;
            this.currentUser = null;
            UIManager.showPage(UIManager.pages.landing);
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

class UIManager {
    static pages = {
        landing: document.getElementById('landing-page'),
        main: document.getElementById('main-page'),
        updateProfile: document.getElementById('update-profile-page')
    };

    static showPage(page) {
        Object.values(this.pages).forEach(p => p.classList.remove('active-page'));
        page.classList.add('active-page');
    }

    static toggleForms() {
        document.getElementById('login-form').classList.toggle('d-none');
        document.getElementById('register-form').classList.toggle('d-none');
    }

    static showLoginForm() {
        document.getElementById('2fa-form').classList.add('d-none');
        document.getElementById('login-form').classList.remove('d-none');
        document.getElementById('register-form').classList.add('d-none');
        if (AuthManager.currentOTPTimer) {
            clearInterval(AuthManager.currentOTPTimer);
            AuthManager.currentOTPTimer = null;
        }
        sessionStorage.removeItem('tempUserEmail');
    }

    static showToast(message, type = 'info') {
        ToastManager.show(message, type);
    }

    static async loadMainPage() {
        this.showPage(this.pages.main);

        try {
            // Get user profile
            const profile = await ProfileManager.fetchUserProfile();
            if (profile) {
                AuthManager.currentUser = profile;

                // Update UI elements
                this.updateProfileDisplay(profile);

                // Load user stats
                this.loadUserStats(profile);

                // Load users list FIRST
                await UserManager.loadUsersList();

                // Load friends list AFTER users list
                await FriendManager.updateFriendListUI();

                // THEN initialize chat status socket
                ChatManager.initStatusWebSocket();

                // Load match history
                const matches = await AuthManager.fetchMatchHistory();
                MatchManager.displayMatchHistory(matches);
            }
        } catch (error) {
            console.error('Error loading main page:', error);
            this.showToast('Failed to load user data', 'danger');
        }

        // After loading all components
        this.applyUsernameClickability();
    }

    static loadUserStats(profile) {
        document.getElementById('stats-username').textContent = profile.username;
        document.getElementById('stats-match-wins').textContent = profile.match_wins || 0;
        document.getElementById('stats-tourney-wins').textContent = profile.tourney_wins || 0;
        document.getElementById('stats-total-matches').textContent = profile.total_matches || 0;
        document.getElementById('stats-total-tourneys').textContent = profile.total_tourneys || 0;
    }

    static async loadUpdateProfilePage() {
        try {
            const profile = await ProfileManager.fetchUserProfile();
            if (profile) {
                // Pre-fill the form with current values
                document.getElementById('update-username').value = profile.username || '';
                document.getElementById('update-email').value = profile.email || '';
                // Don't pre-fill password
                document.getElementById('update-password').value = '';
            }
        } catch (error) {
            console.error('Error loading profile page:', error);
            UIManager.showToast('Failed to load profile data', 'danger');
        }
    }

    static updateProfileDisplay(profile) {
        // Update UI elements
        document.getElementById('username-display').textContent = profile.username;
        if (profile.avatar) {
            const profileAvatar = document.getElementById('profile-avatar');
            if (profileAvatar) {
                profileAvatar.src = profile.avatar || '/media/avatars/default.svg';
            }
        }
    }

    static async showUserProfile(userId) {
        try {
            const modalElement = document.getElementById('userProfileModal');
            if (!modalElement) {
                console.error('User profile modal not found in DOM');
                return;
            }

            // Clean up any existing modal instance
            const existingModal = bootstrap.Modal.getInstance(modalElement);
            if (existingModal) {
                existingModal.dispose();
            }

            // Show loading state
            const modal = new bootstrap.Modal(modalElement, {
                backdrop: 'static', // Prevent closing when clicking outside
                keyboard: true      // Allow closing with Esc key
            });
            
            const modalBody = modalElement.querySelector('.modal-body');
            modalBody.innerHTML = `
                <div class="text-center">
                    <div class="spinner-border text-primary" role="status">
                        <span class="visually-hidden">Loading...</span>
                    </div>
                </div>
            `;
            
            modal.show();

            // Add event listener for modal hidden event
            modalElement.addEventListener('hidden.bs.modal', () => {
                modal.dispose(); // Clean up the modal instance
            }, { once: true }); // Use once: true to ensure the listener is removed after first use

            // Fetch user profile data
            const response = await AuthManager.fetchWithAuth(`${AuthManager.API_BASE}users/profile/${userId}/`);
            if (!response.ok) throw new Error('Failed to fetch user profile');
            const profile = await response.json();

            // Fetch recent matches
            const matchesResponse = await AuthManager.fetchWithAuth(`${AuthManager.API_BASE}matches/history/${userId}/`);
            if (!matchesResponse.ok) throw new Error('Failed to fetch match history');
            const matches = await matchesResponse.json();
            
            // Update modal content
            modalBody.innerHTML = `
                <div class="text-center mb-3">
                    <img id="modal-user-avatar" src="${profile.avatar_url || '/media/avatars/default.svg'}" 
                         class="rounded-circle" style="width: 100px; height: 100px;"
                         onerror="this.src='/media/avatars/default.svg'">
                    <h4 id="modal-username" class="mt-2">${profile.username}</h4>
                </div>
                <div class="row text-center mb-3">
                    <div class="col-6">
                        <p class="mb-0"><strong>Match Wins</strong></p>
                        <p id="modal-match-wins">${profile.match_wins || 0}</p>
                    </div>
                    <div class="col-6">
                        <p class="mb-0"><strong>Total Matches</strong></p>
                        <p id="modal-total-matches">${profile.total_matches || 0}</p>
                    </div>
                    <div class="col-6">
                        <p class="mb-0"><strong>Tournament Wins</strong></p>
                        <p id="modal-tourney-wins">${profile.tourney_wins || 0}</p>
                    </div>
                    <div class="col-6">
                        <p class="mb-0"><strong>Total Tournaments</strong></p>
                        <p id="modal-total-tourneys">${profile.total_tourneys || 0}</p>
                    </div>
                </div>
                <div class="recent-matches">
                    <h5>Recent Matches</h5>
                    <div id="modal-recent-matches">
                        ${matches.slice(0, 5).map(match => `
                            <div class="match-item border-bottom py-2">
                                <div class="d-flex justify-content-between">
                                    <span class="clickable-username ${match.winner_name === match.player1_name ? 'text-success' : ''}"
                                          data-user-id="${match.player1_id}">
                                        ${match.player1_name}
                                    </span>
                                    <span>vs</span>
                                    <span class="clickable-username ${match.winner_name === match.player2_name ? 'text-success' : ''}"
                                          data-user-id="${match.player2_id}">
                                        ${match.player2_name}
                                    </span>
                                </div>
                                <div class="text-center">
                                    Score: ${match.player1_score} - ${match.player2_score}
                                </div>
                                <small class="text-muted">${new Date(match.end_time || match.start_time).toLocaleString()}</small>
                            </div>
                        `).join('') || '<p class="text-muted">No recent matches</p>'}
                    </div>
                </div>
            `;

            // Setup chat button
            const chatBtn = modalElement.querySelector('#modal-chat-btn');
            if (chatBtn) {
                chatBtn.onclick = () => {
                    modal.hide(); // Use hide() instead of dispose()
                    ChatManager.startChat(profile.id, profile.username);
                };
            }

            // Make usernames in recent matches clickable
            modalElement.querySelectorAll('.clickable-username').forEach(el => {
                const userId = el.dataset.userId;
                const username = el.textContent.trim();
                if (userId) {
                    this.makeUsernameClickable(el, userId, username);
                }
            });

        } catch (error) {
            console.error('Error fetching user profile:', error);
            UIManager.showToast('Failed to load user profile', 'danger');
            const modalInstance = bootstrap.Modal.getInstance(document.getElementById('userProfileModal'));
            if (modalInstance) {
                modalInstance.dispose();
            }
        }
    }

    static makeUsernameClickable(element, userId, username) {
        if (!element || !userId) return;
        
        element.style.cursor = 'pointer';
        element.style.textDecoration = 'underline';
        element.classList.add('clickable-username');
        
        // Create a new element with the same properties
        const newElement = element.cloneNode(true);
        
        // Replace the old element with the new one
        element.parentNode.replaceChild(newElement, element);
        
        // Add click handler to the new element
        newElement.addEventListener('click', async (e) => {
            e.preventDefault();
            e.stopPropagation();

            // Close any existing modal before showing the new one
            const existingModal = bootstrap.Modal.getInstance(document.getElementById('userProfileModal'));
            if (existingModal) {
                existingModal.hide();
                await new Promise(resolve => setTimeout(resolve, 150)); // Wait for modal to close
            }

            this.showUserProfile(userId);
        });
    }

    static applyUsernameClickability() {
        // Apply to match history
        document.querySelectorAll('.match-history-item').forEach(item => {
            const player1El = item.querySelector('.player1-name');
            const player2El = item.querySelector('.player2-name');
            if (player1El && player1El.dataset.userId) {
                this.makeUsernameClickable(player1El, player1El.dataset.userId);
            }
            if (player2El && player2El.dataset.userId) {
                this.makeUsernameClickable(player2El, player2El.dataset.userId);
            }
        });

        // Apply to friends list
        document.querySelectorAll('#friend-list-body .friend-username').forEach(el => {
            const userId = el.closest('tr').dataset.userId;
            if (userId) {
                this.makeUsernameClickable(el, userId);
            }
        });

        // Apply to users list
        document.querySelectorAll('#users-table-body .user-username').forEach(el => {
            const userId = el.closest('tr').dataset.userId;
            if (userId) {
                this.makeUsernameClickable(el, userId);
            }
        });

        // Apply to tournament brackets
        document.querySelectorAll('.tournament-player-name').forEach(el => {
            if (el.dataset.userId) {
                this.makeUsernameClickable(el, el.dataset.userId);
            }
        });
    }
}

class ChatManager {
    static chatSocket = null;
    static statusSocket = null;
    static currentChatPartner = null;
    static reconnectAttempts = 0;
    static reconnectTimeout = null;
    static MAX_RECONNECT_ATTEMPTS = 5;
    static blockedUsers = new Set();

    static initStatusWebSocket() {
        try {
            // Use the same host as the current page
            const wsScheme = window.location.protocol === 'https:' ? 'wss' : 'ws';
            const wsUrl = `${wsScheme}://${window.location.host}/ws/status/?token=${encodeURIComponent(AuthManager.accessToken)}`;
            
            console.log('Connecting to WebSocket:', wsUrl); // Debug log
            
            if (this.statusSocket) {
                this.statusSocket.close();
            }

            this.statusSocket = new WebSocket(wsUrl);
            
            this.statusSocket.onopen = () => {
                console.log('Status WebSocket connected');
                // Reset all users to offline initially
                document.querySelectorAll('[data-user-status]').forEach(badge => {
                    badge.className = 'badge bg-secondary';
                    badge.textContent = 'Offline';
                });
            };
            
            this.statusSocket.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    console.log('Status WebSocket message:', data);
                    
                    if (data.type === 'initial_status') {
                        // Reset all users to offline first
                        document.querySelectorAll('[data-user-status]').forEach(badge => {
                            badge.className = 'badge bg-secondary';
                            badge.textContent = 'Offline';
                        });
                        
                        // Update all online users
                        data.online_users.forEach(userId => {
                            this.updateUserStatus(userId, true);
                        });
                    } else if (data.type === 'status_update') {
                        this.updateUserStatus(data.user_id, data.online_status);
                    }
                } catch (error) {
                    console.error('Error handling WebSocket message:', error);
                }
            };

            this.statusSocket.onclose = (event) => {
                console.log('Status WebSocket disconnected:', event.code, event.reason);
                // Attempt to reconnect after a delay
                setTimeout(() => {
                    if (AuthManager.accessToken) {
                        this.initStatusWebSocket();
                    }
                }, 5000);
            };

            this.statusSocket.onerror = (error) => {
                console.error('WebSocket error:', error);
            };
        } catch (error) {
            console.error('Error initializing WebSocket:', error);
        }
    }

    static updateUserStatus(userId, isOnline) {
        console.log('Updating status:', userId, isOnline);
        
        // Update all status badges for this user
        const statusBadges = document.querySelectorAll(`[data-user-status="${userId}"]`);
        statusBadges.forEach(statusBadge => {
            if (statusBadge) {
                // Check if this is in the friends list modal (has different styling)
                const isInFriendsList = statusBadge.closest('#friendsListModal') !== null;
                
                if (isInFriendsList) {
                    // For friends list modal
                    statusBadge.textContent = isOnline ? 'Online' : 'Offline';
                    statusBadge.className = isOnline ? 'badge bg-success' : 'badge bg-secondary';
                } else {
                    // For main users list
                    statusBadge.className = `badge ${isOnline ? 'bg-success' : 'bg-secondary'}`;
                    statusBadge.textContent = isOnline ? 'Online' : 'Offline';
                }
            }
        });

        // Update friend list status in modal
        const friendRow = document.querySelector(`#friend-list-body tr[data-user-id="${userId}"]`);
        if (friendRow) {
            const statusBadge = friendRow.querySelector(`[data-user-status="${userId}"]`);
            if (statusBadge) {
                statusBadge.textContent = isOnline ? 'Online' : 'Offline';
                statusBadge.className = isOnline ? 'badge bg-success' : 'badge bg-secondary';
            }
        }

        // Update chat header if this is the current chat partner
        if (this.currentChatPartner && this.currentChatPartner.id === userId) {
            const chatHeader = document.getElementById('chat-header');
            if (chatHeader) {
                const username = this.currentChatPartner.username;
                chatHeader.innerHTML = `
                    Chat with ${username} 
                    <span class="badge ${isOnline ? 'bg-success' : 'bg-secondary'} ms-2">
                        ${isOnline ? 'Online' : 'Offline'}
                    </span>
                `;
            }
        }
    }

    static cleanup() {
        clearTimeout(this.reconnectTimeout);
        this.reconnectAttempts = 0;
        
        if (this.statusSocket) {
            this.statusSocket.close();
            this.statusSocket = null;
        }
        if (this.chatSocket) {
            this.chatSocket.close();
            this.chatSocket = null;
        }
    }

    static initializeEventListeners() {
        document.getElementById('toggle-chat').addEventListener('click', (e) => {
            e.stopPropagation();
            const chatContainer = document.getElementById('chat-container');
            const chatBody = chatContainer.querySelector('.card-body');
            const icon = document.querySelector('#toggle-chat i');
            
            if (chatBody.style.display !== 'none') {
                chatBody.style.display = 'none';
                icon.className = 'bi bi-chevron-up';
                chatContainer.style.transform = 'translateY(calc(100% - 38px))';
            } else {
                chatBody.style.display = 'block';
                icon.className = 'bi bi-dash-lg';
                chatContainer.style.transform = 'none';
            }
        });

        document.getElementById('close-chat').addEventListener('click', (e) => {
            e.stopPropagation();
            const chatContainer = document.getElementById('chat-container');
            chatContainer.style.display = 'none';
            
            // Reset chat if needed
            const chatMessages = document.getElementById('chat-messages');
            if (chatMessages) {
                chatMessages.innerHTML = '';
            }
            
            // Reset chat state
            this.currentChatPartner = null;
            if (this.chatSocket) {
                this.chatSocket.close();
                this.chatSocket = null;
            }
        });
    }

    static startChat(userId, username) {
        // Check if user is blocked
        const userRow = document.querySelector(`[data-user-id="${userId}"]`);
        if (userRow?.classList.contains('blocked-user')) {
            UIManager.showToast('Cannot chat with blocked user', 'warning');
            return;
        }
        
        this.currentChatPartner = { id: userId, username };
        const chatContainer = document.getElementById('chat-container');
        const chatHeader = document.getElementById('chat-header');
        const statusBadge = document.querySelector(`[data-user-status="${userId}"]`);
        const isOnline = statusBadge?.classList.contains('bg-success');
        const isBlocked = userRow?.classList.contains('blocked-user');
        
        chatHeader.innerHTML = `
            <div class="d-flex justify-content-between align-items-center w-100">
                <span>Chat with ${username}</span>
                <div>
                    <button id="block-user" class="btn btn-sm ${isBlocked ? 'btn-secondary' : 'btn-danger'} me-2">
                        <i class="bi bi-slash-circle"></i>
                    </button>
                    <button id="toggle-chat" class="btn btn-sm btn-outline-light">
                        <i class="bi bi-dash-lg"></i>
                    </button>
                    <button id="close-chat" class="btn btn-sm btn-outline-light">
                        <i class="bi bi-x-lg"></i>
                    </button>
                </div>
            </div>
        `;
        
        // Add block button event listener
        document.getElementById('block-user').addEventListener('click', async (e) => {
            e.stopPropagation();
            const isCurrentlyBlocked = e.target.closest('button').classList.contains('btn-secondary');
            if (isCurrentlyBlocked) {
                await ChatManager.unblockUser(userId);
            } else {
                await ChatManager.blockUser(userId);
            }
        });
        
        chatContainer.style.display = 'block';
        chatContainer.style.transform = 'none';
        const chatBody = chatContainer.querySelector('.card-body');
        chatBody.style.display = 'block';
        
        // Re-initialize event listeners after recreating the buttons
        this.initializeEventListeners();
        
        const apiHost = new URL(AuthManager.API_BASE).host;
        const wsScheme = window.location.protocol === 'https:' ? 'wss' : 'ws';
        const wsUrl = `${wsScheme}://${apiHost}/ws/chat/${AuthManager.currentUser.id}/${userId}/?token=${AuthManager.accessToken}`;
        
        if (this.chatSocket) {
            this.chatSocket.close();
        }
        
        this.chatSocket = new WebSocket(wsUrl);
        this.chatSocket.onmessage = this.handleChatMessage.bind(this);
        this.chatSocket.onclose = this.handleChatClose.bind(this);
        
        this.loadPreviousMessages(userId);
        document.getElementById('chat-messages').innerHTML = '';
        document.getElementById('usersModal')?.querySelector('[data-bs-dismiss="modal"]')?.click();
    }

    static async loadPreviousMessages(userId) {
        try {
            const response = await AuthManager.fetchWithAuth(`${AuthManager.API_BASE}users/messages/${userId}/`);
            if (!response.ok) throw new Error('Failed to load messages');
            const messages = await response.json();
            
            const messagesContainer = document.getElementById('chat-messages');
            messagesContainer.innerHTML = ''; // Clear existing messages
            
            messages.forEach(msg => {
                if (!msg.is_blocked) {
                    const messageElement = createChatMessage(msg);
                    messagesContainer.appendChild(messageElement);
                }
            });
            
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
        } catch (error) {
            console.error('Error loading messages:', error);
        }
    }

    static handleChatMessage(event) {
        const data = JSON.parse(event.data);
        console.log('WebSocket message data:', data); // Debug log
        if (data.type === 'chat_message') {
            const messagesContainer = document.getElementById('chat-messages');
            const messageElement = createChatMessage({
                ...data,
                sender: {
                    id: data.sender_id,
                    username: data.sender_display_name || data.username,
                    avatar_url: data.sender_avatar_url || '/media/avatars/default.svg'
                },
                timestamp: new Date().toISOString()
            });
            
            messagesContainer.appendChild(messageElement);
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
        }
    }

    static handleChatClose() {
        if (this.reconnectAttempts < this.MAX_RECONNECT_ATTEMPTS) {
            this.reconnectTimeout = setTimeout(() => {
                this.reconnectAttempts++;
                this.startChat(this.currentChatPartner.id, this.currentChatPartner.username);
            }, 5000);
        }
    }

    static sendMessage() {
        const input = document.getElementById('message-input');
        const message = input.value.trim();
        
        if (message && this.chatSocket && this.chatSocket.readyState === WebSocket.OPEN) {
            this.chatSocket.send(JSON.stringify({
                message: message,
                recipient: this.currentChatPartner.id
            }));
            input.value = '';
        }
    }

    static escapeHtml(unsafe) {
        return unsafe
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    static async blockUser(userId) {
        try {
            const response = await AuthManager.fetchWithAuth(`${AuthManager.API_BASE}users/block/${userId}/`, {
                method: 'POST'
            });
            
            if (!response.ok) throw new Error('Failed to block user');
            
            // Update UI without reloading the list
            this.updateBlockedStatus(userId, true);
            UIManager.showToast('User blocked successfully', 'success');
            
            // Close chat if open with blocked user
            if (this.currentChatPartner?.id === userId) {
                document.getElementById('close-chat').click();
            }

            return true;  // Return success
        } catch (error) {
            console.error('Error blocking user:', error);
            UIManager.showToast('Failed to block user', 'danger');
            return false;
        }
    }

    static async unblockUser(userId) {
        try {
            const response = await AuthManager.fetchWithAuth(`${AuthManager.API_BASE}users/unblock/${userId}/`, {
                method: 'POST'
            });
            
            if (!response.ok) throw new Error('Failed to unblock user');
            
            // Update UI without reloading the list
            this.updateBlockedStatus(userId, false);
            UIManager.showToast('User unblocked successfully', 'success');

            return true;  // Return success
        } catch (error) {
            console.error('Error unblocking user:', error);
            UIManager.showToast('Failed to unblock user', 'danger');
            return false;
        }
    }

    static updateBlockedStatus(userId, isBlocked) {
        const userRow = document.querySelector(`[data-user-id="${userId}"]`);
        if (userRow) {
            const chatBtn = userRow.querySelector('.chat-btn');
            const blockBtn = userRow.querySelector('.block-btn');
            const statusBadge = userRow.querySelector(`[data-user-status="${userId}"]`);
            const wasOnline = statusBadge?.classList.contains('bg-success');
            
            if (isBlocked) {
                userRow.classList.add('blocked-user');
                chatBtn.disabled = true;
                blockBtn.textContent = 'Unblock';
                blockBtn.classList.replace('btn-danger', 'btn-secondary');
            } else {
                userRow.classList.remove('blocked-user');
                chatBtn.disabled = false;
                blockBtn.textContent = 'Block';
                blockBtn.classList.replace('btn-secondary', 'btn-danger');
            }

            // Preserve online status
            if (statusBadge) {
                statusBadge.className = `badge ${wasOnline ? 'bg-success' : 'bg-secondary'}`;
                statusBadge.textContent = wasOnline ? 'Online' : 'Offline';
            }

            // Update chat header if this is the current chat partner
            if (this.currentChatPartner?.id === userId) {
                const chatHeader = document.getElementById('chat-header');
                if (chatHeader) {
                    const blockButton = chatHeader.querySelector('#block-user');
                    if (blockButton) {
                        blockButton.className = `btn btn-sm ${isBlocked ? 'btn-secondary' : 'btn-danger'} me-2`;
                    }
                }
            }
        }
    }
}

class FriendManager {
    static friendsModal = null;
    static addFriendModal = null; // Add this to track the add friend modal instance

    static initializeEventListeners() {
        // Initialize the modals
        this.friendsModal = new bootstrap.Modal(document.getElementById('friendsListModal'));
        this.addFriendModal = new bootstrap.Modal(document.getElementById('addFriendModal'));
        
        // Show friends list button handler
        document.getElementById('show-friends-btn')?.addEventListener('click', async () => {
            await this.updateFriendListUI();
            this.friendsModal.show();

            // Request status update for all friends when modal is opened
            const friends = await this.fetchFriendList();
            if (friends.length > 0 && ChatManager.statusSocket?.readyState === WebSocket.OPEN) {
                ChatManager.statusSocket.send(JSON.stringify({
                    type: 'get_status',
                    user_ids: friends.map(friend => friend.id)
                }));
            }
        });

        // Add friend form submission handler
        document.getElementById('add-friend-form')?.addEventListener('submit', async (e) => {
            e.preventDefault();
            const usernameInput = document.getElementById('friend-username');
            const username = usernameInput.value.trim();
            
            if (username) {
                const success = await this.sendFriendRequest(username);
                if (success) {
                    usernameInput.value = '';
                    this.addFriendModal.hide();
                    await this.updateFriendListUI();
                    // Show friends list modal after successful add
                    setTimeout(() => this.friendsModal.show(), 150);
                }
            }
        });

        // Add friend button click handler
        document.getElementById('add-friend-btn')?.addEventListener('click', () => {
            this.friendsModal.hide();
            setTimeout(() => this.addFriendModal.show(), 150);
        });

        // Handle modal cleanup
        document.getElementById('addFriendModal')?.addEventListener('hidden.bs.modal', (event) => {
            // Remove modal-open class and backdrop
            document.body.classList.remove('modal-open');
            const backdrop = document.querySelector('.modal-backdrop');
            if (backdrop) {
                backdrop.remove();
            }
            // Reset any inline styles added by Bootstrap
            document.body.style.removeProperty('padding-right');
            document.body.style.removeProperty('overflow');
        });

        // When friends list modal is hidden
        document.getElementById('friendsListModal')?.addEventListener('hidden.bs.modal', () => {
            // Clean up friends list modal
            document.body.classList.remove('modal-open');
            const backdrop = document.querySelector('.modal-backdrop');
            if (backdrop) {
                backdrop.remove();
            }
            document.body.style.removeProperty('padding-right');
            document.body.style.removeProperty('overflow');
        });

        // Restore WebSocket status updates listener
        if (ChatManager.statusSocket) {
            ChatManager.statusSocket.addEventListener('message', (event) => {
                try {
                    const data = JSON.parse(event.data);
                    if (data.type === 'status_update' || data.type === 'initial_status') {
                        this.updateFriendStatus(data);
                    }
                } catch (error) {
                    console.error('Error handling WebSocket message:', error);
                }
            });
        }
    }

    static updateFriendStatus(data) {
        if (data.type === 'initial_status' && Array.isArray(data.online_users)) {
            // Update all friends' status based on the initial status list
            const statusBadges = document.querySelectorAll('#friend-list-body [data-user-status]');
            statusBadges.forEach(badge => {
                const userId = badge.getAttribute('data-user-status');
                const isOnline = data.online_users.includes(parseInt(userId));
                this.updateStatusBadge(badge, isOnline);
            });
        } else if (data.type === 'status_update') {
            // Update individual friend status
            const badge = document.querySelector(`#friend-list-body [data-user-status="${data.user_id}"]`);
            if (badge) {
                this.updateStatusBadge(badge, data.online_status);
            }
        }
    }

    static updateStatusBadge(badge, isOnline) {
        badge.className = `badge ${isOnline ? 'bg-success' : 'bg-secondary'}`;
        badge.textContent = isOnline ? 'Online' : 'Offline';
    }

    static async fetchFriendList() {
        try {
            const response = await AuthManager.fetchWithAuth(`${AuthManager.API_BASE}users/friends/`);
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
            }
            return await response.json();
        } catch (error) {
            console.error('Error fetching friend list:', error);
            UIManager.showToast('Failed to load friends list. Please try again later.', 'danger');
            return [];
        }
    }

    static async sendFriendRequest(username) {
        try {
            // First get the user's ID
            const searchResponse = await AuthManager.fetchWithAuth(
                `${AuthManager.API_BASE}users/?username=${encodeURIComponent(username)}`
            );

            if (!searchResponse.ok) {
                throw new Error('Failed to find user');
            }

            const users = await searchResponse.json();
            if (!users || users.length === 0) {
                throw new Error('User not found');
            }

            // Find the exact user match (case-sensitive)
            const userToAdd = users.find(user => user.username === username);
            if (!userToAdd) {
                throw new Error('User not found');
            }

            // Verify we're not trying to add ourselves
            if (userToAdd.id === AuthManager.currentUser.id) {
                throw new Error('Cannot add yourself as friend');
            }

            // Send the friend request using the user's ID
            const response = await AuthManager.fetchWithAuth(
                `${AuthManager.API_BASE}users/${userToAdd.id}/friend-request/`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json'
                    }
                }
            );

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Failed to send friend request');
            }

            await this.updateFriendListUI();
            UIManager.showToast('Friend request sent successfully!', 'success');
            return true;
        } catch (error) {
            console.error('Friend request error:', error);
            UIManager.showToast(error.message, 'danger');
            return false;
        }
    }

    static async removeFriend(friendId) {
        try {
            const response = await AuthManager.fetchWithAuth(
                `${AuthManager.API_BASE}users/${friendId}/unfriend/`,
                {
                    method: 'DELETE',
                    headers: {
                        'Content-Type': 'application/json'
                    }
                }
            );

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Failed to remove friend');
            }

            await this.updateFriendListUI();
            UIManager.showToast('Friend removed successfully', 'success');
        } catch (error) {
            console.error('Remove friend error:', error);
            UIManager.showToast(error.message, 'danger');
        }
    }

    static async updateFriendListUI() {
        try {
            const friends = await this.fetchFriendList();
            const friendListBody = document.getElementById('friend-list-body');
            
            if (!friendListBody) {
                console.error('Friend list body element not found');
                return;
            }

            friendListBody.innerHTML = '';

            if (!Array.isArray(friends) || friends.length === 0) {
                const emptyRow = document.createElement('tr');
                emptyRow.innerHTML = `
                    <td colspan="3" class="text-center py-4">
                        <div class="text-muted">
                            <i class="bi bi-people fs-2"></i>
                            <p class="mt-2">No friends added yet</p>
                            <button class="btn btn-sm btn-primary" data-bs-toggle="modal" data-bs-target="#addFriendModal">
                                <i class="bi bi-person-plus"></i> Add Your First Friend
                            </button>
                        </div>
                    </td>
                `;
                friendListBody.appendChild(emptyRow);
                return;
            }

            friends.forEach(friend => {
                // Get the online status from the users list
                const userInList = document.querySelector(`#users-table-body [data-user-status="${friend.id}"]`);
                const isOnline = userInList?.classList.contains('bg-success') || false;
                
                const row = document.createElement('tr');
                row.setAttribute('data-user-id', friend.id);
                row.innerHTML = `
                    <td>
                        <div class="d-flex align-items-center">
                            <img src="${friend.avatar_url || '/media/avatars/default.svg'}" 
                                 alt="${friend.username}" 
                                 class="rounded-circle me-2"
                                 style="width: 24px; height: 24px;"
                                 onerror="this.src='/media/avatars/default.svg'">
                            <span class="friend-username clickable-username" data-user-id="${friend.id}">
                                ${friend.username}
                            </span>
                        </div>
                    </td>
                    <td>
                        <span class="badge ${isOnline ? 'bg-success' : 'bg-secondary'}" 
                              data-user-status="${friend.id}"
                              data-user-name="${friend.username}">
                            ${isOnline ? 'Online' : 'Offline'}
                        </span>
                    </td>
                    <td class="text-end friend-actions">
                        <button class="btn btn-sm btn-primary me-1 chat-btn" 
                                title="Chat with ${friend.username}">
                            <i class="bi bi-chat-dots"></i>
                        </button>
                        <button class="btn btn-sm btn-danger remove-friend" 
                                title="Remove ${friend.username}">
                            <i class="bi bi-person-x"></i>
                        </button>
                    </td>
                `;

                // Add event listeners
                const chatBtn = row.querySelector('.chat-btn');
                chatBtn.addEventListener('click', () => {
                    ChatManager.startChat(friend.id, friend.username);
                });

                const removeBtn = row.querySelector('.remove-friend');
                removeBtn.addEventListener('click', async (e) => {
                    e.preventDefault();
                    if (confirm(`Are you sure you want to remove ${friend.username} from your friends list?`)) {
                        await this.removeFriend(friend.id);
                    }
                });

                friendListBody.appendChild(row);

                // After creating the row, make username clickable
                const usernameEl = row.querySelector('.friend-username');
                UIManager.makeUsernameClickable(usernameEl, friend.id, friend.username);
            });
        } catch (error) {
            console.error('Error updating friend list UI:', error);
            UIManager.showToast('Failed to update friends list', 'danger');
        }
    }
}

class Utils {
    static escapeHtml(unsafe) {
        return unsafe
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    static handleAvatarError(imgElement, username) {
        let retryCount = 0;
        const maxRetries = 2;
        
        imgElement.onerror = () => {
            if (retryCount < maxRetries) {
                retryCount++;
                imgElement.src = '/media/avatars/default.svg';
            } else {
                imgElement.style.display = 'none';
                const placeholder = document.createElement('div');
                placeholder.className = 'avatar-placeholder';
                placeholder.textContent = username.charAt(0).toUpperCase();
                imgElement.parentNode.insertBefore(placeholder, imgElement);
            }
        };
    }

    static preloadDefaultAvatar() {
        const img = new Image();
        img.src = '/media/avatars/default.svg';
    }
}

class ToastManager {
    static show(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast align-items-center text-white bg-${type} border-0`;
        toast.innerHTML = `
            <div class="d-flex">
                <div class="toast-body">${message}</div>
                <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
            </div>
        `;
        
        document.body.appendChild(toast);
        
        // Check if bootstrap is available
        if (typeof bootstrap !== 'undefined') {
            new bootstrap.Toast(toast, { autohide: true, delay: 3000 }).show();
        } else {
            // Fallback if bootstrap is not available
            toast.style.display = 'block';
            toast.style.position = 'fixed';
            toast.style.top = '20px';
            toast.style.right = '20px';
            toast.style.zIndex = '9999';
            
            setTimeout(() => {
                toast.style.opacity = '0';
                toast.style.transition = 'opacity 0.5s ease-out';
                setTimeout(() => toast.remove(), 500);
            }, 3000);
        }
        
        setTimeout(() => toast.remove(), 3500);
    }
}

// Add ProfileManager class definition
class ProfileManager {
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

            // Reload main page and switch back
            await UIManager.loadMainPage();
            UIManager.showPage(UIManager.pages.main);

        } catch (error) {
            console.error('Profile update error:', error);
            UIManager.showToast(error.message || 'Failed to update profile', 'danger');
        }
    }
}

class UserManager {
    static usersModal = null;

    static initializeEventListeners() {
        // Initialize the modal
        this.usersModal = new bootstrap.Modal(document.getElementById('usersListModal'));
        
        // Show users list button handler
        document.getElementById('show-users-btn')?.addEventListener('click', async () => {
            await this.loadUsersList();
            this.usersModal.show();

            // Request status update for all users when modal is opened
            const userIds = Array.from(document.querySelectorAll('#users-table-body [data-user-status]'))
                .map(el => el.getAttribute('data-user-status'));
            
            if (userIds.length > 0 && ChatManager.statusSocket?.readyState === WebSocket.OPEN) {
                ChatManager.statusSocket.send(JSON.stringify({
                    type: 'get_status',
                    user_ids: userIds.map(id => parseInt(id))
                }));
            }
        });

        // Handle modal shown event to update statuses
        document.getElementById('usersListModal')?.addEventListener('shown.bs.modal', () => {
            // Update all status badges based on current status information
            document.querySelectorAll('#users-table-body [data-user-status]').forEach(badge => {
                const userId = badge.getAttribute('data-user-status');
                const userRow = document.querySelector(`#users-table-body tr[data-user-id="${userId}"]`);
                if (userRow) {
                    const isOnline = document.querySelector(`[data-user-status="${userId}"].bg-success`) !== null;
                    badge.className = `badge ${isOnline ? 'bg-success' : 'bg-secondary'}`;
                    badge.textContent = isOnline ? 'Online' : 'Offline';
                }
            });
        });

        // Handle modal cleanup
        document.getElementById('usersListModal')?.addEventListener('hidden.bs.modal', () => {
            document.body.classList.remove('modal-open');
            const backdrop = document.querySelector('.modal-backdrop');
            if (backdrop) {
                backdrop.remove();
            }
            document.body.style.removeProperty('padding-right');
            document.body.style.removeProperty('overflow');
        });
    }

    static async loadUsersList() {
        try {
            const response = await AuthManager.fetchWithAuth(`${AuthManager.API_BASE}users/`);
            if (!response.ok) {
                throw new Error(`Failed to fetch users: ${response.status}`);
            }
            
            const users = await response.json();
            const tableBody = document.getElementById('users-table-body');
            if (!tableBody) {
                console.error('Users table body element not found');
                return;
            }
            
            tableBody.innerHTML = '';
            
            users.forEach(user => {
                if (user.id === AuthManager.currentUser?.id) return;
                
                // Check if user is online (by checking existing status badges)
                const existingStatus = document.querySelector(`[data-user-status="${user.id}"].bg-success`);
                const isOnline = existingStatus !== null;
                
                const row = document.createElement('tr');
                row.setAttribute('data-user-id', user.id);
                if (user.is_blocked) {
                    row.classList.add('blocked-user');
                }
                
                row.innerHTML = `
                    <td>
                        <span class="user-username clickable-username" data-user-id="${user.id}">
                            ${Utils.escapeHtml(user.username)}
                        </span>
                    </td>
                    <td>
                        <button class="btn btn-primary btn-sm chat-btn me-2" 
                                ${user.is_blocked ? 'disabled' : ''}>
                            <i class="bi bi-chat-dots"></i> Chat
                        </button>
                        <button class="btn btn-sm ${user.is_blocked ? 'btn-secondary' : 'btn-danger'} block-btn">
                            ${user.is_blocked ? 'Unblock' : 'Block'}
                        </button>
                    </td>
                    <td>
                        <span class="badge ${isOnline ? 'bg-success' : 'bg-secondary'}" 
                              data-user-status="${user.id}"
                              data-user-name="${Utils.escapeHtml(user.username)}">
                            ${isOnline ? 'Online' : 'Offline'}
                        </span>
                    </td>
                `;

                // Add event listeners
                const username = row.querySelector('.user-username');
                UIManager.makeUsernameClickable(username, user.id, user.username);

                const chatBtn = row.querySelector('.chat-btn');
                const blockBtn = row.querySelector('.block-btn');

                chatBtn.addEventListener('click', () => {
                    this.usersModal.hide();
                    ChatManager.startChat(user.id, user.username);
                });

                blockBtn.addEventListener('click', () => {
                    const isCurrentlyBlocked = user.is_blocked;
                    if (isCurrentlyBlocked) {
                        ChatManager.unblockUser(user.id).then(() => {
                            user.is_blocked = false;
                        });
                    } else {
                        ChatManager.blockUser(user.id).then(() => {
                            user.is_blocked = true;
                        });
                    }
                });

                tableBody.appendChild(row);
            });
        } catch (error) {
            console.error('Error loading users list:', error);
            UIManager.showToast(`Error loading users list: ${error.message}`, 'danger');
        }
    }
}

class MatchManager {
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

    static displayMatchHistory(matches) {
        const container = document.getElementById('match-history');
        container.innerHTML = matches.length ? '' : '<p>No recent matches</p>';
        
        matches.slice(0, AuthManager.RECENT_MATCHES_LIMIT).forEach(match => {
            const matchElement = document.createElement('div');
            matchElement.className = 'mb-2 p-2 bg-dark rounded match-history-item';
            
            const winner = match.winner_name;
            const winnerClass = match.player1_name === winner ? 'text-success' : 'text-danger';
            
            matchElement.innerHTML = `
                <div>
                    <strong class="player1-name ${match.player1_name === winner ? winnerClass : ''}" 
                            data-user-id="${match.player1_id}">
                        ${match.player1_name}
                    </strong> 
                    vs 
                    <strong class="player2-name ${match.player2_name === winner ? winnerClass : ''}"
                            data-user-id="${match.player2_id}">
                        ${match.player2_name}
                    </strong>
                    <div>Score: ${match.player1_score} - ${match.player2_score}</div>
                    <small class="text-muted">${new Date(match.end_time || match.start_time).toLocaleString()}</small>
                    ${winner ? `<div class="mt-1"><small class="text-success">Winner: ${winner}</small></div>` : ''}
                </div>
            `;

            container.appendChild(matchElement);
        });

        // Make usernames clickable
        UIManager.applyUsernameClickability();
    }

    static async initializeGame(mode, opponent = null) {
        try {
            const currentUser = AuthManager.currentUser;
            const player2Name = mode === 'PVP' ? 
                localStorage.getItem('player2Name') || 'Player 2' : 
                'AI';

            const payload = {
                player1_name: currentUser.username,
                player2_name: player2Name,
                player1_score: 0,
                player2_score: 0,
                tournament: null
            };

            const response = await AuthManager.fetchWithAuth(`${AuthManager.API_BASE}matches/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            if (!response.ok) throw new Error('Failed to initialize game');
            const matchData = await response.json();

            // Initialize the game canvas and start the game
            const gameCanvas = document.getElementById('game-canvas');
            if (gameCanvas) {
                // Initialize game with matchData
                window.initializeGame(matchData);
                UIManager.showToast(`${mode.toUpperCase()} match started!`, 'success');
            }
        } catch (error) {
            console.error('Error initializing game:', error);
            UIManager.showToast('Failed to start game', 'danger');
        }
    }

    static async createTournament() {
        try {
            const response = await AuthManager.fetchWithAuth(`${AuthManager.API_BASE}tournaments/create/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) throw new Error('Failed to create tournament');
            const tournamentData = await response.json();
            UIManager.showToast('Tournament created successfully!', 'success');
            return tournamentData;
        } catch (error) {
            console.error('Error creating tournament:', error);
            UIManager.showToast('Failed to create tournament', 'danger');
            throw error;
        }
    }

    static async createMatch(player1Score, player2Score, mode = 'AI') {
        try {
            const currentUser = AuthManager.currentUser;
            const player2Name = mode === 'PVP' ? 
                localStorage.getItem('player2Name') || 'Player 2' : 
                'Computer';

            const matchData = {
                player1_name: currentUser.username,
                player2_name: player2Name,
                player1_score: player1Score,
                player2_score: player2Score,
                tournament: null,
                end_time: new Date().toISOString()
            };

            const response = await AuthManager.fetchWithAuth(`${AuthManager.API_BASE}matches/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(matchData)
            });

            if (!response.ok) {
                throw new Error('Failed to save match');
            }

            return await response.json();
        } catch (error) {
            console.error('Error saving match:', error);
            UIManager.showToast('Failed to save match result', 'danger');
            throw error;
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {

    // 2FA form submit handler
    const twoFAForm = document.getElementById('2fa-form');
    if (twoFAForm) {
        twoFAForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const otp = document.getElementById('otp-input').value.trim();
            if (otp.length !== 6) {
                alert('Please enter the 6-digit verification code.');
                return;
            }
            await verify2FA(otp);
        });
    }

    // Back to login button handler
    const backToLoginBtn = document.getElementById('back-to-login');
    if (backToLoginBtn) {
        backToLoginBtn.addEventListener('click', () => {
            document.getElementById('2fa-form').classList.add('d-none');
            document.getElementById('login-form').classList.remove('d-none');
            sessionStorage.removeItem('tempUserEmail');
        });
    }

    // OTP input validation (only allow numbers and max 6 digits)
    const otpInput = document.getElementById('otp-input');
    if (otpInput) {
        otpInput.addEventListener('input', (e) => {
            e.target.value = e.target.value.replace(/[^0-9]/g, '').slice(0, 6);
        });
    }

    document.getElementById('register-form').addEventListener('submit', async (e) => {
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

    document.getElementById('2fa-form')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const otp = document.getElementById('otp-input').value.trim();
        if (otp.length !== 6) {
            UIManager.showToast('Please enter the 6-digit verification code.', 'warning');
            return;
        }
        await AuthManager.verify2FA(otp);
    });

    document.getElementById('logout-btn').addEventListener('click', () => AuthManager.logout());

    // Form toggle listeners
    document.getElementById('register-link').addEventListener('click', UIManager.toggleForms);
    document.getElementById('login-link').addEventListener('click', UIManager.toggleForms);

    // Profile listeners
    document.getElementById('update-profile-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        try {
            const form = e.target;
            const formData = new FormData(form);
            
            // Log the form data before submission
            console.log('Submitting form data:');
            for (let [key, value] of formData.entries()) {
                console.log(`${key}: ${key === 'password' ? '[REDACTED]' : value}`);
            }
            
            await ProfileManager.updateProfile(formData);
        } catch (error) {
            console.error('Form submission error:', error);
            UIManager.showToast('Failed to submit form', 'danger');
        }
    });

    // Auth related listeners
    document.getElementById('login-form')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const [username, password] = e.target.querySelectorAll('input');
        try {
            await AuthManager.login(username.value, password.value);
        } catch (error) {
            UIManager.showToast('Login failed', 'danger');
        }
    });

    // Update profile form handler
    document.getElementById('update-profile-form')?.addEventListener('submit', (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        ProfileManager.updateProfile(formData);
    });

    // Chat related listeners
    document.getElementById('send-button').addEventListener('click', () => {
        ChatManager.sendMessage();
    });

    document.getElementById('message-input').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            ChatManager.sendMessage();
        }
    });

    // 2FA toggle form handler
    document.getElementById('2fa-toggle-form')?.addEventListener('submit', async (e) => {
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

    document.getElementById('play-player-btn').addEventListener('click', async () => {
        if (!AuthManager.accessToken) {
            window.location.href = '/';
            return;
        }
    
        try {
            const response = await fetch('/src/assets/components/player2-setup.html');
            const html = await response.text();
            
            // Hide main page
            document.getElementById('main-page').classList.remove('active-page');
            
            // Create and show setup page
            const setupDiv = document.createElement('div');
            setupDiv.id = 'setup-page';
            setupDiv.classList.add('page', 'active-page');
            setupDiv.innerHTML = html;
            document.body.appendChild(setupDiv);
    
            // Add event listeners after adding to DOM
            const setupForm = document.getElementById('player2-setup-form');
            const cancelBtn = document.getElementById('cancel-btn');
    
            setupForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const player2Name = document.getElementById('player2-name').value;
                localStorage.setItem('player2Name', player2Name);
    
                // Load pong game
                const pongResponse = await fetch('/src/assets/components/pong.html');
                const pongHtml = await pongResponse.text();
                
                // Remove setup page
                setupDiv.remove();
                
                // Create and show game page
                const gameDiv = document.createElement('div');
                gameDiv.id = 'game-page';
                gameDiv.classList.add('page', 'active-page');
                gameDiv.innerHTML = pongHtml;
                document.body.appendChild(gameDiv);
    
                // Initialize PvP game
                requestAnimationFrame(() => {
                    if (typeof initGame === 'function') {
                        initGame('PVP');
                    }
                });
            });
    
            cancelBtn.addEventListener('click', () => {
                setupDiv.remove();
                document.getElementById('main-page').classList.add('active-page');
            });
    
        } catch (error) {
            console.error('Error loading setup page:', error);
            UIManager.showToast('Failed to load the setup page', 'danger');
        }
    });
    
    document.getElementById('play-ai-btn').addEventListener('click', async () => {
        if (!AuthManager.accessToken) {
            window.location.href = '/';
            return;
        }
    
        try {
            const response = await fetch('/src/assets/components/pong.html');
            const html = await response.text();
            
            // Hide main page
            document.getElementById('main-page').classList.remove('active-page');
            
            // Create and show game page
            const gameDiv = document.createElement('div');
            gameDiv.id = 'game-page';
            gameDiv.classList.add('page', 'active-page');
            gameDiv.innerHTML = html;
            document.body.appendChild(gameDiv);
    
            // Initialize game immediately after canvas is available
            requestAnimationFrame(() => {
                if (typeof initGame === 'function') {
                    initGame();
                }
            }, 100);
    
        } catch (error) {
            console.error('Error loading game:', error);
            UIManager.showToast('Failed to load the game', 'danger');
        }
    });
    
    document.getElementById('create-tournament-btn').addEventListener('click', async () => {
        if (!AuthManager.accessToken) {
            window.location.href = '/';
            return;
        }
    
        try {
            const response = await fetch('/src/assets/components/tournament-setup.html');
            const html = await response.text();
            
            // Hide main page
            document.getElementById('main-page').classList.remove('active-page');
            
            const setupDiv = document.createElement('div');
            setupDiv.id = 'tournament-setup-page';
            setupDiv.classList.add('page', 'active-page');
            setupDiv.innerHTML = html;
            document.body.appendChild(setupDiv);
    
            // Setup player selection
            function selectPlayers(count) {
                const inputsContainer = document.getElementById('playerInputs');
                const buttons = document.querySelectorAll('.player-count-btn');
                
                buttons.forEach(btn => {
                    btn.classList.toggle('active', parseInt(btn.dataset.count) === count);
                });
                
                inputsContainer.innerHTML = '';  // Clear existing fields
                
                // Add player input fields
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
    
            // Initialize with 4 players and setup event listeners
            selectPlayers(4);
            document.querySelectorAll('.player-count-btn').forEach(button => {
                button.addEventListener('click', () => selectPlayers(parseInt(button.dataset.count)));
            });
    
            // Setup form validation and submission
            const setupForm = document.getElementById('tournamentForm');
            setupForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                
                const inputs = [
                    document.getElementById('currentPlayer'),
                    ...document.querySelectorAll('#playerInputs input')
                ];
                const players = [];
                let hasError = false;
                const errorMessages = new Set();
    
                // Validate all inputs
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
    
                // Update username and start tournament
                try {
                    // Store player nicknames
                    localStorage.setItem('tournamentPlayers', JSON.stringify(players));
                    
                    // Load and show tournament game
                    const pongResponse = await fetch('/src/assets/components/pong.html');
                    setupDiv.remove();
                    
                    const gameDiv = document.createElement('div');
                    gameDiv.id = 'game-page';
                    gameDiv.classList.add('page', 'active-page');
                    gameDiv.innerHTML = await pongResponse.text();
                    document.body.appendChild(gameDiv);
    
                    requestAnimationFrame(() => {
                        if (typeof initGame === 'function') initGame('TOURNAMENT');
                    });
                } catch (error) {
                    console.error('Error:', error);
                    UIManager.showToast('Failed to start tournament', 'danger');
                }
            });
    
            // Setup cancel and input handlers
            document.getElementById('cancelBtn').addEventListener('click', () => {
                setupDiv.remove();
                document.getElementById('main-page').classList.add('active-page');
            });
    
            document.addEventListener('input', (e) => {
                if (e.target.matches('#playerInputs input, #currentPlayer')) {
                    e.target.classList.remove('is-invalid');
                    const alert = document.querySelector('.alert');
                    if (alert) alert.remove();
                }
            });
    
        } catch (error) {
            console.error('Error loading tournament setup:', error);
            UIManager.showToast('Failed to load the tournament setup', 'danger');
        }
    });

    // Initialize chat event listeners
    ChatManager.initializeEventListeners();

    // Preload default avatar
    Utils.preloadDefaultAvatar();

    // Profile related listeners
    document.getElementById('user-profile').addEventListener('click', () => {
        UIManager.showPage(UIManager.pages.updateProfile);
    });

    document.getElementById('back-to-main').addEventListener('click', (e) => {
        e.preventDefault();
        UIManager.showPage(UIManager.pages.main);
    });

    // Initialize friend list
    FriendManager.initializeEventListeners();
    if (AuthManager.accessToken) {
        FriendManager.updateFriendListUI();
    }

    // Modify OAuth button handler
    const oauth42Btn = document.getElementById('oauth-42-btn');
    if (oauth42Btn) {
        oauth42Btn.addEventListener('click', (e) => {
            e.preventDefault();
            // Store current URL before redirect
            sessionStorage.setItem('preAuthPath', window.location.pathname);
            window.location.href = `${AuthManager.API_BASE}auth/oauth/login/`;
        });
    }

    // Check for OAuth callback
    if (window.location.search.includes('code=')) {
        handleOAuthCallback();
    }

    // Initialize UserManager event listeners
    UserManager.initializeEventListeners();
});

// Add this function to handle URL parameters
const getUrlParams = () => {
    const params = new URLSearchParams(window.location.search);
    return {
        accessToken: params.get('access_token'),
        refreshToken: params.get('refresh_token'),
        authError: params.get('auth_error')
    };
};

// Update the initialization code
document.addEventListener('DOMContentLoaded', () => {
    // Check for auth error first
    const { accessToken: urlAccessToken, refreshToken: urlRefreshToken, authError } = getUrlParams();
    
    if (authError) {
        alert('Authentication failed: ' + decodeURIComponent(authError));
        UIManager.showPage(UIManager.pages.landing);
        // Clean up URL
        window.history.replaceState({}, document.title, '/');
        return;
    }

    if (urlAccessToken && urlRefreshToken) {
        // Store tokens
        localStorage.setItem('accessToken', urlAccessToken);
        localStorage.setItem('refreshToken', urlRefreshToken);
        AuthManager.accessToken = urlAccessToken;
        AuthManager.refreshToken = urlRefreshToken;
        
        // Clean up URL
        window.history.replaceState({}, document.title, '/');
        
        // Show main page
        UIManager.showPage(UIManager.pages.main);
        UIManager.loadMainPage();
        return;
    }

    // ... rest of your DOMContentLoaded code ...
});

function createChatMessage(message) {
    const messageWrapper = document.createElement('div');
    const isSentByMe = message.sender_id === AuthManager.currentUser.id;
    messageWrapper.className = `message-wrapper ${isSentByMe ? 'sent' : 'received'}`;
    
    const timestamp = new Date(message.timestamp);
    const timeStr = timestamp.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: false 
    });
    const dateStr = timestamp.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric' 
    });
    
    const senderName = isSentByMe ? 
        AuthManager.currentUser.username : 
        message.sender_display_name;
    
    const senderAvatar = isSentByMe ? 
        AuthManager.currentUser.avatar : 
        message.sender_avatar_url;
    
    const avatarContainer = document.createElement('div');
    avatarContainer.className = 'avatar-container';
    
    const avatarImg = document.createElement('img');
    avatarImg.className = 'avatar profile-clickable';
    avatarImg.setAttribute('data-user-id', message.sender_id);
    avatarImg.alt = senderName;
    
    // Add click handler to avatar
    avatarImg.addEventListener('click', () => {
        UIManager.showUserProfile(message.sender_id);
    });
    
    let retryCount = 0;
    const maxRetries = 2;
    
    const loadAvatar = (url) => {
        avatarImg.src = url;
    };
    
    avatarImg.onerror = () => {
        if (retryCount < maxRetries) {
            retryCount++;
            loadAvatar('/media/avatars/default.svg');
        } else {
            avatarImg.style.display = 'none';
            const placeholder = document.createElement('div');
            placeholder.className = 'avatar-placeholder';
            placeholder.textContent = senderName.charAt(0).toUpperCase();
            avatarContainer.appendChild(placeholder);
        }
    };
    
    loadAvatar(senderAvatar);
    avatarContainer.appendChild(avatarImg);
    
    const messageContent = document.createElement('div');
    messageContent.className = 'message-content';
    messageContent.innerHTML = `
        <div class="message-header clickable-username" 
             data-user-id="${message.sender_id}">
            ${Utils.escapeHtml(senderName)}
        </div>
        <div class="message-bubble">${Utils.escapeHtml(message.content)}</div>
        <div class="message-meta">
            <span class="timestamp">${timeStr}</span>
            <span class="date">${dateStr}</span>
        </div>
    `;
    
    // Make username clickable
    UIManager.makeUsernameClickable(
        messageContent.querySelector('.message-header'),
        message.sender_id,
        senderName
    );
    
    // Always add avatar first, then message content
    messageWrapper.appendChild(avatarContainer);
    messageWrapper.appendChild(messageContent);
    
    return messageWrapper;
}

// Make refreshAccessToken available globally
// window.refreshAccessToken = refreshAccessToken;

// Keep handleOAuthCallback function definition but move it before it's used
const handleOAuthCallback = async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    if (code) {
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
                UIManager.showPage(UIManager.pages.main);
                await UIManager.loadMainPage();
            } else {
                throw new Error(data.error || 'OAuth authentication failed');
            }
        } catch (error) {
            console.error('OAuth callback error:', error);
            UIManager.showToast('Authentication failed. Please try again.', 'danger');
            UIManager.showPage(UIManager.pages.landing);
        }
    }
};

// Update initialization code
if (AuthManager.accessToken) {
    UIManager.loadMainPage();
} else {
    UIManager.showPage(UIManager.pages.landing);
}

// Add this to your existing styles or create a new style tag
const style = document.createElement('style');
style.textContent = `
    .clickable-username {
        cursor: pointer;
        text-decoration: underline;
        color: inherit;
    }
    
    .clickable-username:hover {
        opacity: 0.8;
        text-decoration: none;
    }
`;
document.head.appendChild(style);
