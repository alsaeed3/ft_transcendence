const API_BASE = 'https://localhost/api/';
const RECENT_MATCHES_LIMIT = 5;
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

    static logout() {
        ChatManager.cleanup();
        localStorage.clear();
        this.accessToken = null;
        this.refreshToken = null;
        this.currentUser = null;
        UIManager.showPage(UIManager.pages.landing);
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

    static showToast(message, type = 'info') {
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

    static async loadMainPage() {
        this.showPage(this.pages.main);

        try {
            const profile = await ProfileManager.fetchUserProfile();
            if (profile) {
                AuthManager.currentUser = profile;
                document.getElementById('username-display').textContent = profile.username;
                if (profile.avatar) {
                    document.getElementById('profile-avatar').src = profile.avatar;
                }

                document.getElementById('player-stats').innerHTML = `
                    <p>Username: ${profile.username}</p>
                    <p>Email: ${profile.email}</p>
                    <p>Wins: ${profile.stats?.wins || 0}</p>
                    <p>Losses: ${profile.stats?.losses || 0}</p>
                `;

                await UserManager.loadUsersList();
                ChatManager.initStatusWebSocket();

                const matches = await MatchManager.fetchMatchHistory();
                MatchManager.displayMatchHistory(matches);
            }
        } catch (error) {
            console.error('Error loading main page:', error);
            if (error.message.includes('401')) {
                window.location.href = '/';
            }
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
        const apiHost = new URL(API_BASE).host;
        const wsScheme = window.location.protocol === 'https:' ? 'wss' : 'ws';
        const wsUrl = `${wsScheme}://${apiHost}/ws/status/?token=${AuthManager.accessToken}`;

        this.statusSocket = new WebSocket(wsUrl);
        this.statusSocket.onmessage = (event) => {
            const data = JSON.parse(event.data);
            this.updateUserStatus(data.user_id, data.online_status);
        };

        this.statusSocket.onclose = () => {
            setTimeout(() => this.initStatusWebSocket(), 5000);
        };
    }

    static updateUserStatus(userId, isOnline) {
        const statusBadge = document.querySelector(`[data-user-status="${userId}"]`);
        if (statusBadge) {
            statusBadge.className = `badge ${isOnline ? 'bg-success' : 'bg-secondary'}`;
            statusBadge.textContent = isOnline ? 'Online' : 'Offline';
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

    static startChat(userId, username) {
        this.currentChatPartner = { id: userId, username };
        const chatContainer = document.getElementById('chat-container');
        const chatHeader = document.getElementById('chat-header');
        chatHeader.textContent = `Chat with ${username}`;
        chatContainer.style.display = 'block';
        
        const apiHost = new URL(API_BASE).host;
        const wsScheme = window.location.protocol === 'https:' ? 'wss' : 'ws';
        const wsUrl = `${wsScheme}://${apiHost}/ws/chat/${userId}/?token=${AuthManager.accessToken}`;
        
        if (this.chatSocket) {
            this.chatSocket.close();
        }
        
        this.chatSocket = new WebSocket(wsUrl);
        this.chatSocket.onmessage = this.handleChatMessage.bind(this);
        this.chatSocket.onclose = this.handleChatClose.bind(this);
        
        document.getElementById('chat-messages').innerHTML = '';
        document.getElementById('usersModal')?.querySelector('[data-bs-dismiss="modal"]')?.click();
    }

    static handleChatMessage(event) {
        const data = JSON.parse(event.data);
        const messagesContainer = document.getElementById('chat-messages');
        const messageElement = document.createElement('div');
        messageElement.className = `list-group-item ${data.sender === AuthManager.currentUser.id ? 'bg-primary' : 'bg-secondary'}`;
        messageElement.textContent = data.message;
        messagesContainer.appendChild(messageElement);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
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
}

class ProfileManager {
    static async fetchUserProfile() {
        try {
            const response = await AuthManager.fetchWithAuth(`${API_BASE}users/profile/`);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            return await response.json();
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
            const response = await AuthManager.fetchWithAuth(`${API_BASE}users/profile/`, {
                method: 'PUT',
                body: formData
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
                row.innerHTML = `
                    <td>${this.escapeHtml(user.username)}</td>
                    <td>
                        <button class="btn btn-primary btn-sm chat-btn" 
                                onclick="ChatManager.startChat(${user.id}, '${this.escapeHtml(user.username)}')">
                            <i class="bi bi-chat-dots"></i> Chat
                        </button>
                    </td>
                    <td>
                        <span class="badge ${user.online_status ? 'bg-success' : 'bg-secondary'}" 
                              data-user-status="${user.id}">
                            ${user.online_status ? 'Online' : 'Offline'}
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
            const response = await AuthManager.fetchWithAuth(`${API_BASE}matches/history/?limit=${RECENT_MATCHES_LIMIT}`);
            if (!response.ok) throw new Error('Failed to fetch match history');
            return await response.json();
        } catch (error) {
            console.error('Error fetching match history:', error);
            return [];
        }
    }

    static displayMatchHistory(matches) {
        const container = document.getElementById('match-history');
        container.innerHTML = matches.length ? '' : '<p>No recent matches</p>';
        
        matches.forEach(match => {
            const matchElement = document.createElement('div');
            matchElement.className = 'mb-2 p-2 bg-dark rounded';
            matchElement.innerHTML = `
                <div>
                    <strong>${match.player1_username}</strong> vs 
                    <strong>${match.player2_username}</strong>
                </div>
                <div>Score: ${match.score}</div>
                <small class="text-muted">${new Date(match.timestamp).toLocaleString()}</small>
            `;
            container.appendChild(matchElement);
        });
    }

    static async initializeGame(mode, opponent = null) {
        try {
            const payload = {
                mode: mode,
                opponent_id: opponent
            };

            const response = await AuthManager.fetchWithAuth(`${API_BASE}matches/create/`, {
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
    document.getElementById('play-player-btn').addEventListener('click', () => {
        // Show modal to select opponent
        const modal = new bootstrap.Modal(document.getElementById('usersModal'));
        const modalBody = document.querySelector('#usersModal .modal-body');
        modalBody.innerHTML = '<div class="list-group">';
        
        // Fetch and display available players
        AuthManager.fetchWithAuth(`${API_BASE}users/available/`)
            .then(response => response.json())
            .then(users => {
                users.forEach(user => {
                    if (user.id !== AuthManager.currentUser.id) {
                        modalBody.innerHTML += `
                            <button class="list-group-item list-group-item-action"
                                    onclick="MatchManager.initializeGame('pvp', ${user.id})">
                                ${UserManager.escapeHtml(user.username)}
                                <span class="badge ${user.online_status ? 'bg-success' : 'bg-secondary'} float-end">
                                    ${user.online_status ? 'Online' : 'Offline'}
                                </span>
                            </button>
                        `;
                    }
                });
            })
            .catch(error => {
                console.error('Error fetching available players:', error);
                modalBody.innerHTML = '<div class="alert alert-danger">Failed to load players</div>';
            });
        
        modal.show();
    });

    document.getElementById('play-ai-btn').addEventListener('click', () => {
        MatchManager.initializeGame('ai');
    });

    document.getElementById('create-tournament-btn').addEventListener('click', async () => {
        try {
            await MatchManager.createTournament();
        } catch (error) {
            console.error('Tournament creation failed:', error);
        }
    });
});

// Initial page load
if (AuthManager.accessToken) {
    UIManager.loadMainPage();
} else {
    UIManager.showPage(UIManager.pages.landing);
}

// Make refreshAccessToken available globally
window.refreshAccessToken = () => AuthManager.refreshAccessToken();