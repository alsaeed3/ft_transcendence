const API_BASE = 'https://localhost/api/';
const RECENT_MATCHES_LIMIT = 3;
const currentOTPTimer = null;
const MAX_RECONNECT_ATTEMPTS = 5;

class AuthManager {

    static accessToken = localStorage.getItem('accessToken');
    static refreshToken = localStorage.getItem('refreshToken');
    static currentUser = null;

    static async refreshAccessToken() {
        try {
            const response = await fetch(`${API_BASE}token/refresh/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ refresh: this.refreshToken })
            });
            
            if (!response.ok) throw new Error('Token refresh failed');
            const data = await response.json();
            this.accessToken = data.access;
            localStorage.setItem('accessToken', this.accessToken);
            return this.accessToken;
        } catch (error) {
            localStorage.clear();
            UIManager.showPage(UIManager.pages.landing);
            throw error;
        }
    }

    static async fetchWithAuth(url, options = {}) {
        let response = await fetch(url, {
            ...options,
            headers: {
                ...options.headers,
                'Authorization': `Bearer ${this.accessToken}`
            }
        });

        if (response.status === 401) {
            const newToken = await this.refreshAccessToken();
            response = await fetch(url, {
                ...options,
                headers: {
                    ...options.headers,
                    'Authorization': `Bearer ${newToken}`
                }
            });
        }
        return response;
    }

    static async login(username, password) {
        try {
            const response = await fetch(`${API_BASE}auth/login/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });
            
            if (!response.ok) throw new Error('Login failed');
            const data = await response.json();
            this.accessToken = data.access;
            this.refreshToken = data.refresh;
            this.currentUser = data.user;
            localStorage.setItem('accessToken', this.accessToken);
            localStorage.setItem('refreshToken', this.refreshToken);
            
            await UIManager.loadMainPage();
        } catch (error) {
            console.error('Login error:', error);
            throw error;
        }
    }

    static async register(userData) {
        try {
            const response = await fetch(`${API_BASE}auth/register/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(userData)
            });

            if (!response.ok) throw new Error('Registration failed');
            alert('Registration successful! Please login.');
            UIManager.toggleForms();
        } catch (error) {
            alert(error.message);
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

    static async verify2FA(otp) {
        try {
            const email = sessionStorage.getItem('tempUserEmail');
            if (!email) {
                throw new Error('Session expired. Please login again.');
            }

            const response = await this.fetchWithAuth(`${this.API_BASE}auth/2fa/verify/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, otp })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Invalid or expired OTP');
            }

            await this.processSuccessfulAuth(data);
        } catch (error) {
            console.error('2FA verification error:', error);
            UIManager.showToast(error.message, 'danger');
        }
    }

    static async processSuccessfulAuth(data) {
        if (!data.access || !data.refresh) {
            throw new Error('Invalid authentication response');
        }
        
        this.accessToken = data.access;
        this.refreshToken = data.refresh;
        localStorage.setItem('accessToken', this.accessToken);
        localStorage.setItem('refreshToken', this.refreshToken);
        
        sessionStorage.removeItem('tempUserEmail');
        
        await UIManager.loadMainPage();
    }

    static async logout() {
        try {
            await fetch(`${API_BASE}auth/logout/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ refresh: this.refreshToken })
            });
        } catch (error) {
            console.error('Logout error:', error);
        } finally {
            ChatManager.cleanup();
            localStorage.clear();
            this.accessToken = null;
            this.refreshToken = null;
            this.currentUser = null;
            UIManager.showPage(UIManager.pages.landing);
        }
    }
}

class UIManager {
    static pages = {
        landing: document.getElementById('landing-page'),
        main: document.getElementById('main-page'),
        updateProfile: document.getElementById('update-profile-page')
    };

    static show2FAForm() {
        document.getElementById('login-form').classList.add('d-none');
        document.getElementById('register-form').classList.add('d-none');
        document.getElementById('2fa-form').classList.remove('d-none');
    }

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
        // Show main page
        this.showPage(this.pages.main);
    
        try {
            // Get user profile
            const profile = await ProfileManager.fetchUserProfile();
            if (profile) {
                AuthManager.currentUser = profile;

                // Update UI elements
                document.getElementById('username-display').textContent = profile.username;
                if (profile.avatar) {
                    const profileAvatar = document.getElementById('profile-avatar');
                    if (profileAvatar) {
                        profileAvatar.src = profile.avatar || '/media/avatars/default.svg';
                    }
                }
                // Load user stats
                this.loadUserStats(profile);

                // Load users list FIRST
                await UserManager.loadUsersList();

                // THEN initialize chat status socket
                ChatManager.initStatusWebSocket();

                // Load match history
                const matches = await MatchManager.fetchMatchHistory();
                MatchManager.displayMatchHistory(matches);
            }
        } catch (error) {
            console.error('Error loading main page:', error);
            this.showToast('Failed to load user data', 'danger');
        }
    }

    static updateProfileDisplay(profile) {
        document.getElementById('username-display').textContent = profile.username;
        const profileAvatar = document.getElementById('profile-avatar');
        
        let retryCount = 0;
        const maxRetries = 2;
        
        const loadAvatar = (url) => {
            profileAvatar.src = url;
        };
        
        profileAvatar.onerror = () => {
            if (retryCount < maxRetries) {
                retryCount++;
                loadAvatar('/media/avatars/default.svg');
            } else {
                profileAvatar.style.display = 'none';
                const placeholder = document.createElement('div');
                placeholder.className = 'avatar-placeholder';
                placeholder.textContent = profile.username.charAt(0).toUpperCase();
                profileAvatar.parentNode.insertBefore(placeholder, profileAvatar);
            }
        };
        
        loadAvatar(profile.avatar_url || '/media/avatars/default.svg');
    }

    static loadUserStats(profile) {
        document.getElementById('stats-username').textContent = profile.username;
        document.getElementById('stats-match-wins').textContent = profile.match_wins || 0;
        document.getElementById('stats-tourney-wins').textContent = profile.tourney_wins || 0;
        document.getElementById('stats-total-matches').textContent = profile.total_matches || 0;
        document.getElementById('stats-total-tourneys').textContent = profile.total_tourneys || 0;
    }

    static async loadUpdateProfilePage() {
        this.showPage(this.pages.updateProfile);
        try {
            const profile = await ProfileManager.fetchUserProfile();
            document.getElementById('update-username').value = profile.username;
            document.getElementById('update-email').value = profile.email;
            
            // Add form submission handler
            const form = document.getElementById('update-profile-form');
            if (form) {
                // Remove any existing listeners
                const newForm = form.cloneNode(true);
                form.parentNode.replaceChild(newForm, form);
                
                newForm.addEventListener('submit', async (e) => {
                    e.preventDefault();
                    const formData = new FormData(e.target);
                    await ProfileManager.updateProfile(formData);
                });
            }

            // Add back button handler
            document.getElementById('back-to-main')?.addEventListener('click', (e) => {
                e.preventDefault();
                this.showPage(this.pages.main);
            });

        } catch (error) {
            console.error('Error loading profile:', error);
            this.showToast('Failed to load profile data', 'danger');
        }
    }
}

class ChatManager {
    static chatSocket = null;
    static statusSocket = null;
    static currentChatPartner = null;
    static reconnectAttempts = 0;
    static reconnectTimeout = null;
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
        console.log('Updating status:', userId, isOnline); // Debug log
        const statusBadge = document.querySelector(`[data-user-status="${userId}"]`);
        if (statusBadge) {
            statusBadge.className = `badge ${isOnline ? 'bg-success' : 'bg-secondary'}`;
            statusBadge.textContent = isOnline ? 'Online' : 'Offline';
            
            // Update chat header if this is the current chat partner
            if (this.currentChatPartner && this.currentChatPartner.id === userId) {
                const chatHeader = document.getElementById('chat-header');
                const username = statusBadge.getAttribute('data-user-name');
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
        
        const apiHost = new URL(API_BASE).host;
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
            const response = await AuthManager.fetchWithAuth(`${API_BASE}users/messages/${userId}/`);
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
        if (this.reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
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
            const response = await AuthManager.fetchWithAuth(`${API_BASE}users/block/${userId}/`, {
                method: 'POST'
            });
            
            if (!response.ok) throw new Error('Failed to block user');
            
            // Update UI
            this.updateBlockedStatus(userId, true);
            UIManager.showToast('User blocked successfully', 'success');
            
            // Close chat if open with blocked user
            if (this.currentChatPartner?.id === userId) {
                document.getElementById('close-chat').click();
            }
            
            // Refresh users list
            await UserManager.loadUsersList();
        } catch (error) {
            console.error('Error blocking user:', error);
            UIManager.showToast('Failed to block user', 'danger');
        }
    }

    static async unblockUser(userId) {
        try {
            const response = await AuthManager.fetchWithAuth(`${API_BASE}users/unblock/${userId}/`, {
                method: 'POST'
            });
            
            if (!response.ok) throw new Error('Failed to unblock user');
            
            // Update UI
            this.updateBlockedStatus(userId, false);
            UIManager.showToast('User unblocked successfully', 'success');
            
            // Refresh users list
            await UserManager.loadUsersList();
        } catch (error) {
            console.error('Error unblocking user:', error);
            UIManager.showToast('Failed to unblock user', 'danger');
        }
    }

    static updateBlockedStatus(userId, isBlocked) {
        const userRow = document.querySelector(`[data-user-id="${userId}"]`);
        if (userRow) {
            const chatBtn = userRow.querySelector('.chat-btn');
            const blockBtn = userRow.querySelector('.block-btn');
            
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
        }
    }
}

class ProfileManager {
    static async fetchUserProfile() {
        try {
            const response = await AuthManager.fetchWithAuth(`${API_BASE}users/me/`);
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
            const data = {};
            formData.forEach((value, key) => {
                if (value) data[key] = value;
            });

            const response = await AuthManager.fetchWithAuth(`${API_BASE}users/profile/`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });

            if (!response.ok) throw new Error('Profile update failed');
            alert('Profile updated successfully!');
            UIManager.loadMainPage();
        } catch (error) {
            alert(error.message);
        }
    }
}

class UserManager {
    static async loadUsersList() {
        try {
            const response = await AuthManager.fetchWithAuth(`${API_BASE}users/`);
            const users = await response.json();
            
            const tableBody = document.getElementById('users-table-body');
            tableBody.innerHTML = '';
            
            users.forEach(user => {
                if (user.id === AuthManager.currentUser?.id) return;
                
                const row = document.createElement('tr');
                row.setAttribute('data-user-id', user.id);
                if (user.is_blocked) {
                    row.classList.add('blocked-user');
                }
                
                row.innerHTML = `
                    <td>${this.escapeHtml(user.username)}</td>
                    <td>
                        <button class="btn btn-primary btn-sm chat-btn me-2" 
                                onclick="ChatManager.startChat(${user.id}, '${this.escapeHtml(user.username)}')"
                                ${user.is_blocked ? 'disabled' : ''}>
                            <i class="bi bi-chat-dots"></i> Chat
                        </button>
                        <button class="btn btn-sm ${user.is_blocked ? 'btn-secondary' : 'btn-danger'} block-btn"
                                onclick="${user.is_blocked ? 'ChatManager.unblockUser' : 'ChatManager.blockUser'}(${user.id})">
                            ${user.is_blocked ? 'Unblock' : 'Block'}
                        </button>
                    </td>
                    <td>
                        <span class="badge bg-secondary" 
                              data-user-status="${user.id}"
                              data-user-name="${this.escapeHtml(user.username)}">
                            Offline
                        </span>
                    </td>
                `;
                tableBody.appendChild(row);
            });
        } catch (error) {
            console.error('Error loading users list:', error);
            UIManager.showToast('Error loading users list', 'danger');
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
}

class MatchManager {
    static async fetchMatchHistory() {
        try {
            const response = await AuthManager.fetchWithAuth(`${API_BASE}matches/`);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const matches = await response.json();

            // Sort matches by date (most recent first)
            return matches.sort((a, b) => new Date(b.end_time) - new Date(a.end_time));
        } catch (error) {
            console.error('Error fetching matches:', error);
            return [];
        }
    }

    static displayMatchHistory(matches) {
        const container = document.getElementById('match-history');
        container.innerHTML = matches.length ? '' : '<p>No recent matches</p>';
        
        matches.slice(0, RECENT_MATCHES_LIMIT).forEach(match => {
            const matchElement = document.createElement('div');
            matchElement.className = 'mb-2 p-2 bg-dark rounded';
            
            const winner = match.winner_name;
            const winnerClass = match.player1_name === winner ? 'text-success' : 'text-danger';
            
            matchElement.innerHTML = `
                <div>
                    <strong class="${match.player1_name === winner ? winnerClass : ''}">${match.player1_name}</strong> 
                    vs 
                    <strong class="${match.player2_name === winner ? winnerClass : ''}">${match.player2_name}</strong>
                    <div>Score: ${match.player1_score} - ${match.player2_score}</div>
                    <small class="text-muted">${new Date(match.end_time || match.start_time).toLocaleString()}</small>
                    ${winner ? `<div class="mt-1"><small class="text-success">Winner: ${winner}</small></div>` : ''}
                </div>
            `;

            container.appendChild(matchElement);
        });
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

            const response = await AuthManager.fetchWithAuth(`${API_BASE}matches/`, {
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
            const response = await AuthManager.fetchWithAuth(`${API_BASE}tournaments/create/`, {
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

            const response = await AuthManager.fetchWithAuth(`${API_BASE}matches/`, {
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

// Initialize event listeners
document.addEventListener('DOMContentLoaded', () => {
    // Auth related listeners
    document.getElementById('login-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const [username, password] = e.target.querySelectorAll('input');
        try {
            await AuthManager.login(username.value, password.value);
        } catch (error) {
            UIManager.showToast('Login failed', 'danger');
        }
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

    document.getElementById('logout-btn').addEventListener('click', () => AuthManager.logout());

    // Form toggle listeners
    document.getElementById('register-link').addEventListener('click', UIManager.toggleForms);
    document.getElementById('login-link').addEventListener('click', UIManager.toggleForms);

    // Profile listeners
    document.getElementById('update-profile-form').addEventListener('submit', (e) => {
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

    document.getElementById('toggle-chat').addEventListener('click', () => {
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

    // Profile related listeners
    document.getElementById('user-profile').addEventListener('click', () => {
        UIManager.showPage(UIManager.pages.updateProfile);
    });

    document.getElementById('back-to-main').addEventListener('click', (e) => {
        e.preventDefault();
        UIManager.showPage(UIManager.pages.main);
    });

    // Game related listeners
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
            alert('Failed to load the setup page');
        }
    });
    
    document.getElementById('play-ai-btn').addEventListener('click', async () => {
        // Check if user is logged in
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
            alert('Failed to load the game');
        }
    });
    
    document.getElementById('create-tournament-btn').addEventListener('click', async () => {
        try {
            const response = await fetch(`${API_BASE}tournaments/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${AuthManager.accessToken}`
                },
                body: JSON.stringify({ name: 'New Tournament', participants: [] })
            });
            
            if (!response.ok) throw new Error('Tournament creation failed');
            alert('Tournament created successfully!');
        } catch (error) {
            alert(error.message);
        }
    });

    // Initialize chat event listeners
    ChatManager.initializeEventListeners();
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
    avatarImg.className = 'avatar';
    avatarImg.alt = senderName;
    
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
        <div class="message-header">${escapeHtml(senderName)}</div>
        <div class="message-bubble">${escapeHtml(message.content)}</div>
        <div class="message-meta">
            <span class="timestamp">${timeStr}</span>
            <span class="date">${dateStr}</span>
        </div>
    `;
    
    if (isSentByMe) {
        messageWrapper.appendChild(messageContent);
        messageWrapper.appendChild(avatarContainer);
    } else {
        messageWrapper.appendChild(avatarContainer);
        messageWrapper.appendChild(messageContent);
    }
    
    return messageWrapper;
}

function escapeHtml(unsafe) {
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// window.AuthManager = AuthManager;
// window.UIManager = UIManager;
// window.ChatManager = ChatManager;
// window.ProfileManager = ProfileManager;
// window.UserManager = UserManager;
// window.MatchManager = MatchManager;

if (AuthManager.accessToken) {
    UIManager.loadMainPage();
} else {
    UIManager.showPage(UIManager.pages.landing);
}

window.refreshAccessToken = () => AuthManager.refreshAccessToken();

class Utils {
    static escapeHtml(unsafe) {
        return unsafe
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }
}

// Add preloading for default avatar
function preloadDefaultAvatar() {
    const img = new Image();
    img.src = '/media/avatars/default.svg';
}

// Update the profile display function
function updateProfileDisplay(profile) {
    document.getElementById('username-display').textContent = profile.username;
    const profileAvatar = document.getElementById('profile-avatar');
    
    let retryCount = 0;
    const maxRetries = 2;
    
    const loadAvatar = (url) => {
        profileAvatar.src = url;
    };
    
    profileAvatar.onerror = () => {
        if (retryCount < maxRetries) {
            retryCount++;
            loadAvatar('/media/avatars/default.svg');
        } else {
            // If all retries fail, show initials
            profileAvatar.style.display = 'none';
            const placeholder = document.createElement('div');
            placeholder.className = 'avatar-placeholder';
            placeholder.textContent = profile.username.charAt(0).toUpperCase();
            profileAvatar.parentNode.insertBefore(placeholder, profileAvatar);
        }
    };
    
    loadAvatar(profile.avatar_url || '/media/avatars/default.svg');
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
        new bootstrap.Toast(toast, { autohide: true, delay: 3000 }).show();
        setTimeout(() => toast.remove(), 3500);
    }
}