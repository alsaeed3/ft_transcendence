class AuthManager {
    static API_BASE = 'https://localhost/api/';
    static RECENT_MATCHES_LIMIT = 3;
    static currentOTPTimer = null;
    static MAX_RECONNECT_ATTEMPTS = 5;
    
    static accessToken = localStorage.getItem('accessToken');
    static refreshToken = localStorage.getItem('refreshToken');
    static currentUser = null;

    static async refreshAccessToken() {
        try {
            if (!this.refreshToken) {
                throw new Error("No refresh token available");
            }
            const response = await fetch(`${this.API_BASE}token/refresh/`, {
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
            localStorage.clear();
            UIManager.showPage(UIManager.pages.landing);
            throw error;
        }
    }

    static async fetchWithAuth(url, options = {}) {
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
            if (!this.refreshToken) {
                throw new Error('Session expired. Please login again.');
            }
            
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
                localStorage.clear();
                UIManager.showPage(UIManager.pages.landing);
                throw new Error('Session expired. Please login again.');
            }
        }
        return response;
    }

    static async handleLogin(username, password) {
        try {
            const response = await fetch(`${this.API_BASE}auth/login/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });
            
            const data = await response.json();

            if (response.status === 202 && data['2fa_required']) {
                sessionStorage.setItem('tempUserEmail', data.user.email);
                UIManager.show2FAForm();
                this.startOTPTimer();
                return;
            }

            if (!response.ok) {
                throw new Error(data.error || 'Login failed');
            }

            // Set tokens before loading main page
            this.accessToken = data.access;
            this.refreshToken = data.refresh;
            localStorage.setItem('accessToken', this.accessToken);
            localStorage.setItem('refreshToken', this.refreshToken);
            
            await this.processSuccessfulAuth(data);
        } catch (error) {
            console.error('Login error:', error);
            UIManager.showToast(error.message, 'danger');
        }
    }

    static async register(userData) {
        try {
            const response = await fetch(`${this.API_BASE}auth/register/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(userData)
            });

            if (!response.ok) throw new Error('Registration failed');
            UIManager.showToast('Registration successful! Please login.', 'success');
            UIManager.toggleForms();
        } catch (error) {
            UIManager.showToast(error.message, 'danger');
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
            await fetch(`${this.API_BASE}auth/logout/`, {
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

    static showPage(page) {
        Object.values(this.pages).forEach(p => p.classList.remove('active-page'));
        page.classList.add('active-page');
    }

    static toggleForms() {
        document.getElementById('login-form').classList.toggle('d-none');
        document.getElementById('register-form').classList.toggle('d-none');
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
                await this.loadUserStats(profile);

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

class WebSocketManager {
    static initSocket(url, handlers) {
        const socket = new WebSocket(url);
        socket.onopen = handlers.onOpen;
        socket.onmessage = handlers.onMessage;
        socket.onclose = handlers.onClose;
        socket.onerror = handlers.onError;
        return socket;
    }
}

class ChatManager {
    static chatSocket = null;
    static statusSocket = null;
    static currentChatPartner = null;
    static reconnectAttempts = 0;
    static reconnectTimeout = null;
    static disconnectTimeout = null;
    static blockedUsers = new Set();
    static RECONNECT_DELAY = 1000;
    static DISCONNECT_DELAY = 1000;

    static getWebSocketUrl() {
        const wsScheme = window.location.protocol === 'https:' ? 'wss' : 'ws';
        return `${wsScheme}://${window.location.host}/ws/status/?token=${encodeURIComponent(AuthManager.accessToken)}`;
    }

    static initStatusWebSocket() {
        if (this.disconnectTimeout) {
            clearTimeout(this.disconnectTimeout);
            this.disconnectTimeout = null;
        }

        if (this.statusSocket?.readyState === WebSocket.OPEN) {
            console.log('[WebSocket] Already connected');
            return;
        }

        const userBadges = document.querySelectorAll('[data-user-status]');
        if (userBadges.length === 0) {
            console.warn('[WebSocket] User list not loaded yet, delaying WebSocket connection');
            setTimeout(() => this.initStatusWebSocket(), 500);
            return;
        }

        const wsUrl = this.getWebSocketUrl();
        console.log('[WebSocket] Connecting to:', wsUrl);

        this.statusSocket = WebSocketManager.initSocket(wsUrl, {
            onOpen: () => {
                console.log('[WebSocket] Connected successfully');
                this.reconnectAttempts = 0;
                
                if (this.statusSocket.readyState === WebSocket.OPEN) {
                    console.log('[WebSocket] Requesting initial status');
                    this.statusSocket.send(JSON.stringify({
                        type: 'request_initial_status'
                    }));
                }
            },
            onMessage: (event) => {
                try {
                    const data = JSON.parse(event.data);
                    console.log('[WebSocket] Received message:', data);
                    
                    if (data.type === 'initial_status') {
                        console.log('[WebSocket] Processing initial status. Online users:', data.online_users);
                        
                        const badges = document.querySelectorAll('[data-user-status]');
                        console.log('[WebSocket] Resetting status for', badges.length, 'users');
                        
                        badges.forEach(badge => {
                            const userId = badge.getAttribute('data-user-status');
                            console.log('[WebSocket] Resetting user', userId, 'to offline');
                            badge.className = 'badge bg-secondary';
                            badge.textContent = 'Offline';
                        });
                        
                        if (Array.isArray(data.online_users)) {
                            data.online_users.forEach(userId => {
                                console.log('[WebSocket] Setting user', userId, 'to online');
                                this.updateUserStatus(userId, true);
                            });
                        }
                    } else if (data.type === 'status_update') {
                        console.log('[WebSocket] Status update for user:', data.user_id, 'online:', data.online_status);
                        this.updateUserStatus(data.user_id, data.online_status);
                    }
                } catch (error) {
                    console.error('[WebSocket] Error handling message:', error);
                }
            },
            onClose: (event) => {
                console.log('[WebSocket] Connection closed:', event.code, event.reason);
                if (this.reconnectAttempts < AuthManager.MAX_RECONNECT_ATTEMPTS) {
                    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
                    console.log(`[WebSocket] Attempting reconnect in ${delay}ms (attempt ${this.reconnectAttempts + 1}/${AuthManager.MAX_RECONNECT_ATTEMPTS})`);
                    this.reconnectTimeout = setTimeout(() => {
                        if (AuthManager.accessToken) {
                            this.reconnectAttempts++;
                            this.initStatusWebSocket();
                        }
                    }, delay);
                }
            },
            onError: (error) => {
                console.error('[WebSocket] Error:', error);
            }
        });

        window.addEventListener('beforeunload', this.handleBeforeUnload.bind(this));
    }

    static handleBeforeUnload(event) {
        if (this.disconnectTimeout) {
            clearTimeout(this.disconnectTimeout);
        }

        if (this.statusSocket?.readyState === WebSocket.OPEN) {
            this.statusSocket.close(1000, 'Page closed');
        }
    }

    static updateUserStatus(userId, isOnline) {
        console.log('[Status] Updating status for user:', userId, 'isOnline:', isOnline);
        
        const statusBadge = document.querySelector(`[data-user-status="${userId}"]`);
        if (statusBadge) {
            console.log('[Status] Found badge for user:', userId);
            const oldStatus = statusBadge.textContent;
            statusBadge.className = `badge ${isOnline ? 'bg-success' : 'bg-secondary'}`;
            statusBadge.textContent = isOnline ? 'Online' : 'Offline';
            console.log('[Status] Updated user', userId, 'from', oldStatus, 'to', statusBadge.textContent);
            
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
        } else {
            console.warn('[Status] Badge not found for user:', userId);
            const allBadges = document.querySelectorAll('[data-user-status]');
            console.log('[Status] Available badges:', Array.from(allBadges).map(b => ({
                userId: b.getAttribute('data-user-status'),
                status: b.textContent
            })));
        }
    }

    static cleanup() {
        window.removeEventListener('beforeunload', this.handleBeforeUnload.bind(this));

        clearTimeout(this.reconnectTimeout);
        clearTimeout(this.disconnectTimeout);
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

    static async handleReconnection() {
        if (this.disconnectTimeout) {
            clearTimeout(this.disconnectTimeout);
            this.disconnectTimeout = null;
        }
        if (this.reconnectTimeout) {
            clearTimeout(this.reconnectTimeout);
            this.reconnectTimeout = null;
        }

        await this.reconnectAndSync();
    }

    static startChat(userId, username) {
        this.currentChatPartner = { id: userId, username };
        const chatContainer = document.getElementById('chat-container');
        const chatHeader = document.getElementById('chat-header');
        const statusBadge = document.querySelector(`[data-user-status="${userId}"]`);
        const isOnline = statusBadge?.classList.contains('bg-success');
        
        chatHeader.innerHTML = `
            Chat with ${username}
            <span class="badge ${isOnline ? 'bg-success' : 'bg-secondary'} ms-2">
                ${isOnline ? 'Online' : 'Offline'}
            </span>
        `;
        chatContainer.style.display = 'block';
        
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
            messagesContainer.innerHTML = '';
            
            messages.forEach(msg => {
                const messageElement = createChatMessage({
                    ...msg,
                    sender: {
                        id: msg.sender_id,
                        username: msg.sender_display_name || msg.username,
                        avatar_url: msg.sender_avatar_url || '/media/avatars/default.svg'
                    }
                });
                messagesContainer.appendChild(messageElement);
            });
            
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
        } catch (error) {
            console.error('Error loading messages:', error);
        }
    }

    static handleChatMessage(event) {
        const data = JSON.parse(event.data);
        console.log('WebSocket message data:', data);
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
        if (this.reconnectAttempts < AuthManager.MAX_RECONNECT_ATTEMPTS) {
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

    static async reconnectAndSync() {
        try {
            if (this.statusSocket) {
                this.statusSocket.close();
                this.statusSocket = null;
            }

            const userBadges = document.querySelectorAll('[data-user-status]');
            if (userBadges.length === 0) {
                await UserManager.loadUsersList();
            }

            this.initStatusWebSocket();
        } catch (error) {
            console.error('[WebSocket] Error during reconnection:', error);
        }
    }
}

class ProfileManager {
    static async fetchUserProfile() {
        try {
            const response = await AuthManager.fetchWithAuth(`${AuthManager.API_BASE}users/me/`);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const profile = await response.json();
            
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
            const data = {
                username: formData.get('username'),
                email: formData.get('email'),
                display_name: formData.get('username'),
                password: formData.get('password')
            };

            Object.keys(data).forEach(key => {
                if (!data[key]) {
                    delete data[key];
                }
            });

            const response = await AuthManager.fetchWithAuth(`${AuthManager.API_BASE}users/profile/`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${AuthManager.accessToken}`
                },
                body: JSON.stringify(data)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.username?.[0] || errorData.email?.[0] || errorData.detail || 'Profile update failed');
            }

            UIManager.showToast('Profile updated successfully!', 'success');
            UIManager.loadMainPage();
        } catch (error) {
            console.error('Error updating profile:', error);
            UIManager.showToast(error.message, 'danger');
        }
    }
}

class UserManager {
    static async loadUsersList() {
        try {
            const response = await AuthManager.fetchWithAuth(`${AuthManager.API_BASE}users/`);
            const users = await response.json();
            
            const tableBody = document.getElementById('users-table-body');
            tableBody.innerHTML = '';
            
            users.forEach(user => {
                if (user.id === AuthManager.currentUser?.id) return;
                
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${Utils.escapeHtml(user.username)}</td>
                    <td>
                        <button class="btn btn-primary btn-sm chat-btn" 
                                onclick="ChatManager.startChat(${user.id}, '${Utils.escapeHtml(user.username)}')">
                            <i class="bi bi-chat-dots"></i> Chat
                        </button>
                    </td>
                    <td>
                        <span class="badge bg-secondary" 
                              data-user-status="${user.id}"
                              data-user-name="${Utils.escapeHtml(user.username)}">
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
}

class MatchManager {
    static async fetchMatchHistory() {
        try {
            const response = await AuthManager.fetchWithAuth(`${AuthManager.API_BASE}matches/`);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const matches = await response.json();

            return matches.sort((a, b) => new Date(b.end_time) - new Date(a.end_time));
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
            if (mode === 'PVP') {
                const setupResponse = await fetch('/src/assets/components/player2-setup.html');
                const setupHtml = await setupResponse.text();
                
                document.getElementById('main-page').classList.remove('active-page');
                
                let setupDiv = document.getElementById('setup-page');
                if (!setupDiv) {
                    setupDiv = document.createElement('div');
                    setupDiv.id = 'setup-page';
                    document.body.appendChild(setupDiv);
                }
                setupDiv.className = 'page active-page';
                setupDiv.innerHTML = setupHtml;

                document.getElementById('player2-setup-form')?.addEventListener('submit', async (e) => {
                    e.preventDefault();
                    const player2Name = document.getElementById('player2-name').value;
                    localStorage.setItem('player2Name', player2Name);
                    setupDiv.remove();
                    await this.startGame(mode, player2Name);
                });

                document.getElementById('cancel-btn')?.addEventListener('click', () => {
                    setupDiv.remove();
                    document.getElementById('main-page').classList.add('active-page');
                });
            } else {
                await this.startGame(mode);
            }
        } catch (error) {
            console.error('Error initializing game:', error);
            UIManager.showToast('Failed to start game', 'danger');
        }
    }

    static async startGame(mode, player2Name = null) {
        try {
            const response = await fetch('/src/assets/components/pong.html');
            const html = await response.text();
            
            let gameDiv = document.getElementById('game-page');
            if (!gameDiv) {
                gameDiv = document.createElement('div');
                gameDiv.id = 'game-page';
                document.body.appendChild(gameDiv);
            }
            gameDiv.className = 'page active-page';
            gameDiv.innerHTML = html;

            const currentUser = AuthManager.currentUser;
            const matchData = {
                player1_name: currentUser.username,
                player2_name: mode === 'PVP' ? 
                    player2Name || 'Player 2' : 
                    'AI',
                player1_score: 0,
                player2_score: 0,
                tournament: null
            };

            const matchResponse = await AuthManager.fetchWithAuth(`${AuthManager.API_BASE}matches/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(matchData)
            });

            if (!matchResponse.ok) throw new Error('Failed to initialize game');
            const match = await matchResponse.json();

            requestAnimationFrame(() => {
                if (typeof window.initGame === 'function') {
                    window.initGame(mode, match);
                } else {
                    console.error('Game initialization function not found');
                    UIManager.showToast('Failed to start game', 'danger');
                }
            });

            UIManager.showToast(`${mode.toUpperCase()} match started!`, 'success');
        } catch (error) {
            console.error('Error starting game:', error);
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

            if (!response.ok) throw new Error('Failed to save match');
            return await response.json();
        } catch (error) {
            console.error('Error saving match:', error);
            UIManager.showToast('Failed to save match result', 'danger');
            throw error;
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('login-form')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const [username, password] = e.target.querySelectorAll('input');
        await AuthManager.handleLogin(username.value, password.value);
    });

    document.getElementById('register-form')?.addEventListener('submit', async (e) => {
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

    document.getElementById('logout-btn')?.addEventListener('click', () => {
        AuthManager.logout();
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

    document.getElementById('register-link')?.addEventListener('click', UIManager.toggleForms);
    document.getElementById('login-link')?.addEventListener('click', UIManager.toggleForms);

    document.getElementById('play-player-btn')?.addEventListener('click', async () => {
        if (!AuthManager.accessToken) {
            UIManager.showToast('Please login to play', 'warning');
            return;
        }
        await MatchManager.initializeGame('PVP');
    });

    document.getElementById('play-ai-btn')?.addEventListener('click', async () => {
        if (!AuthManager.accessToken) {
            UIManager.showToast('Please login to play', 'warning');
            return;
        }
        await MatchManager.initializeGame('AI');
    });

    document.getElementById('create-tournament-btn')?.addEventListener('click', MatchManager.createTournament);

    if (AuthManager.accessToken) {
        UIManager.loadMainPage();
    } else {
        UIManager.showPage(UIManager.pages.landing);
    }

    const otpInput = document.getElementById('otp-input');
    if (otpInput) {
        otpInput.addEventListener('input', (e) => {
            e.target.value = e.target.value.replace(/[^0-9]/g, '').slice(0, 6);
        });
    }

    document.getElementById('send-button')?.addEventListener('click', () => {
        ChatManager.sendMessage();
    });

    document.getElementById('message-input')?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            ChatManager.sendMessage();
        }
    });

    document.getElementById('user-profile')?.addEventListener('click', () => {
        UIManager.loadUpdateProfilePage();
    });

    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
            ChatManager.handleReconnection();
        }
    });

    window.addEventListener('online', () => {
        ChatManager.handleReconnection();
    });

    window.addEventListener('offline', () => {
        if (ChatManager.statusSocket) {
            ChatManager.statusSocket.close();
        }
    });
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

window.AuthManager = AuthManager;
window.UIManager = UIManager;
window.ChatManager = ChatManager;
window.ProfileManager = ProfileManager;
window.UserManager = UserManager;
window.MatchManager = MatchManager;

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