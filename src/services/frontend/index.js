class AuthManager {

    static username;
    static API_BASE = 'https://localhost/api/';
    static RECENT_MATCHES_LIMIT = 3;
    static TOKEN_REFRESH_THRESHOLD = 30 * 60 * 1000; // 30 minutes in milliseconds
    static currentOTPTimer = null; // For tracking OTP timer
    static accessToken = localStorage.getItem('accessToken');
    static refreshToken = localStorage.getItem('refreshToken');
    static currentUser = null;

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
            showPage(pages.landing);
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
                // If refresh fails, redirect to login
                localStorage.clear();
                UIManager.showPage(UIManager.pages.landing);
                throw new Error('Session expired. Please login again.');
            }
        }
    
        return response;
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
                // Store email for OTP verification
                sessionStorage.setItem('tempUserEmail', data.user.email);
                // Switch to 2FA form
                UIManager.show2FAForm();
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
            await this.fetchWithAuth(`${this.API_BASE}auth/logout/`, {
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

    static startOTPTimer() {
        if (this.currentOTPTimer) {
            clearInterval(this.currentOTPTimer);
        }
        const timerElement = document.getElementById('otp-timer');
        let timeLeft = 300; // 5 minutes in seconds
    
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
            
            const is42User = profile.is_42_auth;
            const statusElement = document.getElementById('2fa-status');
            const twoFAToggleForm = document.getElementById('2fa-toggle-form');

            if (is42User) {
                statusElement.innerHTML = `
                    <div class="alert alert-info text-center">
                        <strong>2FA is managed by 42 School authentication</strong>
                    </div>
                `;
                twoFAToggleForm.style.display = 'none';
            } else {
                const is2FAEnabled = Boolean(profile.is_2fa_enabled);
                statusElement.innerHTML = `
                    <div class="alert ${is2FAEnabled ? 'alert-success' : 'alert-warning'} text-center">
                        <strong>2FA is currently ${is2FAEnabled ? 'ENABLED' : 'DISABLED'}</strong>
                    </div>
                `;
                twoFAToggleForm.style.display = 'block';
            }
            
            if (profile.avatar) {
                const avatarPreview = document.createElement('img');
                avatarPreview.src = profile.avatar;
                avatarPreview.className = 'mb-3 rounded-circle';
                avatarPreview.style = 'width: 100px; height: 100px;';
                document.getElementById('update-avatar').parentNode.prepend(avatarPreview);
            }
        } catch (error) {
            console.error('Error loading profile:', error);
            this.showToast('Failed to load profile data', 'danger');
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
            const response = await AuthManager.fetchWithAuth(`${AuthManager.API_BASE}users/profile/${userId}/`);
            if (!response.ok) throw new Error('Failed to fetch user profile');
            
            const profile = await response.json();
            
            // Update modal content
            document.getElementById('modal-user-avatar').src = profile.avatar_url || '/media/avatars/default.svg';
            document.getElementById('modal-username').textContent = profile.username;
            document.getElementById('modal-match-wins').textContent = profile.match_wins;
            document.getElementById('modal-total-matches').textContent = profile.total_matches;
            document.getElementById('modal-tourney-wins').textContent = profile.tourney_wins;
            document.getElementById('modal-total-tourneys').textContent = profile.total_tourneys;
            
            // Setup chat button
            const chatBtn = document.getElementById('modal-chat-btn');
            chatBtn.onclick = () => {
                const modal = bootstrap.Modal.getInstance(document.getElementById('userProfileModal'));
                modal.hide();
                ChatManager.startChat(profile.id, profile.username);
            };
            
            // Show modal
            const modal = new bootstrap.Modal(document.getElementById('userProfileModal'));
            modal.show();
        } catch (error) {
            console.error('Error fetching user profile:', error);
            this.showToast('Failed to load user profile', 'danger');
        }
    }
}

class ChatManager {
    static chatSocket = null;
    static statusSocket = null;
    static currentChatPartner = null;
    static MAX_RECONNECT_ATTEMPTS = 5;
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

    static createChatMessage(message) {
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
            showUserProfile(message.sender_id);
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
            <div class="message-header profile-clickable" data-user-id="${message.sender_id}">
                ${escapeHtml(senderName)}
            </div>
            <div class="message-bubble">${escapeHtml(message.content)}</div>
            <div class="message-meta">
                <span class="timestamp">${timeStr}</span>
                <span class="date">${dateStr}</span>
            </div>
        `;
        
        // Add click handler to username
        messageContent.querySelector('.message-header').addEventListener('click', (e) => {
            showUserProfile(e.target.getAttribute('data-user-id'));
        });
        
        // Always add avatar first, then message content
        messageWrapper.appendChild(avatarContainer);
        messageWrapper.appendChild(messageContent);
        
        return messageWrapper;
    }
}

class FriendManager {

    // Add these friend-related functions
    static async fetchFriendList() {
        try {
            const response = await AuthManager.fetchWithAuth(`${AuthManager.API_BASE}users/friends/`);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            return await response.json();
        } catch (error) {
            console.error('Error fetching friend list:', error);
            return [];
        }
    };

    static async addFriend(username) {
        try {
            // First, search for the user by username
            const searchResponse = await AuthManager.fetchWithAuth(`${AuthManager.API_BASE}users/?username=${username}`);
            if (!searchResponse.ok) {
                throw new Error('Failed to find user');
            }
            
            const users = await searchResponse.json();
            if (!Array.isArray(users) || users.length === 0) {
                throw new Error('User not found');
            }

            const user = users[0]; // Get the first matching user

            // Now send the friend request using the found user's ID
            const response = await AuthManager.fetchWithAuth(`${AuthManager.API_BASE}users/${user.id}/friend-request/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.detail || 'Failed to add friend');
            }

            await updateFriendListUI();
            alert('Friend added successfully!');
        } catch (error) {
            UIManager.showToast(error.message, 'danger');
        }
    };

    static async removeFriend(userId) {
        try {
            const response = await AuthManager.fetchWithAuth(`${AuthManager.API_BASE}users/${userId}/unfriend/`, {
                method: 'DELETE'
            });

            if (!response.ok) {
                throw new Error('Failed to remove friend');
            }
            await updateFriendListUI();
        } catch (error) {
            UIManager.showToast(error.message, 'danger');
        }
    };

    static async updateFriendListUI() {
        const friends = await this.fetchFriendList();
        const friendListBody = document.getElementById('friend-list-body');
        friendListBody.innerHTML = '';

        friends.forEach(friend => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${friend.display_name || friend.username}</td>
                <td>
                    <span class="badge ${friend.online_status ? 'bg-success' : 'bg-secondary'}">
                        ${friend.online_status ? 'Online' : 'Offline'}
                    </span>
                </td>
                <td>
                    <button class="btn btn-sm btn-danger remove-friend" data-friend-id="${friend.id}">
                        <i class="bi bi-person-x"></i>
                    </button>
                </td>
            `;
            friendListBody.appendChild(row);
        });

        // Add event listeners for friend removal
        document.querySelectorAll('.remove-friend').forEach(button => {
            button.addEventListener('click', async (e) => {
                const friendId = e.currentTarget.dataset.friendId;
                if (confirm('Are you sure you want to remove this friend?')) {
                    await this.removeFriend(friendId);
                }
            });
        });
    };
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
            // Check if there's a file to upload
            const hasFile = formData.get('avatar') && formData.get('avatar').size > 0;
            
            // Create the data object from form inputs
            const data = {
                username: formData.get('username'),
                email: formData.get('email')
            };

            // Only add password if it's not empty
            const password = formData.get('password');
            if (password) {
                data.password = password;
            }

            // Remove undefined or empty string values
            Object.keys(data).forEach(key => {
                if (!data[key]) {
                    delete data[key];
                }
            });
            
            if (hasFile) {
                // Use FormData for file uploads
                const response = await AuthManager.fetchWithAuth(`${AuthManager.API_BASE}users/profile/`, {
                    method: 'PUT',
                    // Don't set Content-Type header - browser will set it with boundary
                    body: formData
                });

                const responseData = await response.json();
                if (!response.ok) {
                    throw new Error(responseData.detail || responseData.avatar?.[0] || 'Profile update failed');
                }
            } else {
                // Regular JSON request for non-file updates
                const response = await AuthManager.fetchWithAuth(`${AuthManager.API_BASE}users/profile/`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                });

                const responseData = await response.json();
                if (!response.ok) {
                    throw new Error(responseData.detail || 'Profile update failed');
                }
            }

            UIManager.showToast('Profile updated successfully!', 'success');
            await UIManager.loadMainPage();
        } catch (error) {
            console.error('Profile update error:', error);
            UIManager.showToast(error.message || 'Failed to update profile', 'danger');
        }
    }
}

class UserManager {
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
                
                const row = document.createElement('tr');
                row.setAttribute('data-user-id', user.id);
                if (user.is_blocked) {
                    row.classList.add('blocked-user');
                }
                
                row.innerHTML = `
                    <td>${Utils.escapeHtml(user.username)}</td>
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
                        <span class="badge bg-secondary" 
                              data-user-status="${user.id}"
                              data-user-name="${Utils.escapeHtml(user.username)}">
                            Offline
                        </span>
                    </td>
                `;

                // Add event listeners after creating the elements
                const chatBtn = row.querySelector('.chat-btn');
                const blockBtn = row.querySelector('.block-btn');

                chatBtn.addEventListener('click', () => {
                    ChatManager.startChat(user.id, user.username);
                });

                blockBtn.addEventListener('click', () => {
                    const isCurrentlyBlocked = user.is_blocked;
                    if (isCurrentlyBlocked) {
                        ChatManager.unblockUser(user.id).then(() => {
                            user.is_blocked = false;  // Update the user state
                        });
                    } else {
                        ChatManager.blockUser(user.id).then(() => {
                            user.is_blocked = true;  // Update the user state
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
            const response = await AuthManager.fetchWithAuth(`${AuthManager.API_BASE}matches/`);
            
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
        
        // Log form data before submission
        const formData = new FormData(e.target);
        console.log('Form data before submission:');
        for (let [key, value] of formData.entries()) {
            console.log(`${key}: ${value}`);
        }
        
        ProfileManager.updateProfile(formData);
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
            // Load and show tournament setup page
            const response = await fetch('/src/assets/components/tournament-setup.html');
            const html = await response.text();
            
            const setupDiv = document.createElement('div');
            setupDiv.id = 'tournament-setup-page';
            setupDiv.classList.add('page', 'active-page');
            setupDiv.innerHTML = html;
            
            document.getElementById('main-page').classList.remove('active-page');
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
});

// Update initialization code
if (AuthManager.accessToken) {
    UIManager.loadMainPage();
} else {
    UIManager.showPage(UIManager.pages.landing);
}
