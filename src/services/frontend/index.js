const API_BASE = 'https://localhost/api/';
var username;
let accessToken = localStorage.getItem('accessToken');
let refreshToken = localStorage.getItem('refreshToken');
const RECENT_MATCHES_LIMIT = 5;
const MAX_RECONNECT_ATTEMPTS = 5;
let reconnectAttempts = 0;
let reconnectTimeout = null;
let currentChatPartner = null;


// DOM Elements
const pages = {
    landing: document.getElementById('landing-page'),
    main: document.getElementById('main-page'),
    updateProfile: document.getElementById('update-profile-page')
};

const showPage = (page) => {
    Object.values(pages).forEach(p => {
        if (p) p.style.display = 'none';
    });
    if (page) page.style.display = 'block';
};

// Auth utilities
const refreshAccessToken = async () => {
    try {
        const response = await fetch(`${API_BASE}token/refresh/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refresh: refreshToken })
        });
        
        if (!response.ok) throw new Error('Token refresh failed');
        const data = await response.json();
        accessToken = data.access;
        localStorage.setItem('accessToken', accessToken);
        return accessToken;
    } catch (error) {
        localStorage.clear();
        showPage(pages.landing);
        throw error;
    }
};

const fetchWithAuth = async (url, options = {}) => {
    let response = await fetch(url, {
        ...options,
        headers: {
            ...options.headers,
            'Authorization': `Bearer ${accessToken}`
        }
    });

    if (response.status === 401) {
        const newToken = await refreshAccessToken();
        response = await fetch(url, {
            ...options,
            headers: {
                ...options.headers,
                'Authorization': `Bearer ${newToken}`
            }
        });
    }
    return response;
};

// Auth Functions
const handleLogin = async (username, password) => {
    try {
        const response = await fetch(`${API_BASE}auth/login/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        
        if (!response.ok) throw new Error('Login failed');
        const data = await response.json();
        accessToken = data.access;
        refreshToken = data.refresh;
        localStorage.setItem('accessToken', accessToken);
        localStorage.setItem('refreshToken', refreshToken);
        
        await loadMainPage();
    } catch (error) {
        console.error('Login error:', error);
        throw error;
    }
};

const handleRegister = async (userData) => {
    try {
        const response = await fetch(`${API_BASE}auth/register/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(userData)
        });

        if (!response.ok) throw new Error('Registration failed');
        alert('Registration successful! Please login.');
        toggleForms();
    } catch (error) {
        alert(error.message);
    }
};

// Data Fetching
const fetchUserProfile = async () => {
    try {
        const response = await fetchWithAuth(`${API_BASE}users/profile/`, {
            headers: { 
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        return await response.json();
    } catch (error) {
        console.error('Error fetching profile:', error);
        if (error.message.includes('401')) {
            localStorage.clear();
            accessToken = null;
            showPage(pages.landing);
        }
        throw error;
    }
};

const fetchMatchHistory = async () => {
    try {
        const profile = await fetchUserProfile();
        if (!profile) throw new Error('Could not get user profile');

        const response = await fetchWithAuth(`${API_BASE}matches/`);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();

        // Ensure we're getting an array
        const matches = Array.isArray(data) ? data : (data.matches || []);

        // Filter user's matches and sort by date (most recent first)
        const userMatches = matches
            .filter(match => {
                return match.player1 === profile.id || match.player2 === profile.id;
            })
            .sort((a, b) => new Date(b.end_time) - new Date(a.end_time));

        return userMatches;
    } catch (error) {
        console.error('Error fetching matches:', error);
        return [];
    }
};

// Profile Management
const loadUpdateProfilePage = async () => {
    showPage(pages.updateProfile);
    try {
        const profile = await fetchUserProfile();
        document.getElementById('update-username').value = profile.username;
        document.getElementById('update-email').value = profile.email;
    } catch (error) {
        console.error('Error loading profile:', error);
        alert('Failed to load profile data');
    }
};

const handleUpdateProfile = async (e) => {
    e.preventDefault();
    const username = document.getElementById('update-username').value;
    const email = document.getElementById('update-email').value;
    const password = document.getElementById('update-password').value;
    const avatarFile = document.getElementById('update-avatar').files[0];

    const formData = new FormData();
    formData.append('username', username);
    formData.append('email', email);
    if (password) formData.append('password', password);
    if (avatarFile) formData.append('avatar', avatarFile);

    try {
        const response = await fetchWithAuth(`${API_BASE}users/profile/`, {
            method: 'PUT',
            body: formData
        });

        if (!response.ok) throw new Error('Profile update failed');
        alert('Profile updated successfully!');
        loadMainPage();
    } catch (error) {
        alert(error.message);
    }
};

// ====================== WebSocket & Chat Functions ======================
let chatSocket = null;
let currentChatUser = null;
const blockedUsers = new Set();

// Initialize WebSocket connection
const initWebSocket = (otherUserId) => {
    if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
        console.error('Max reconnection attempts reached');
        showToast('Chat connection failed. Please refresh the page.', 'danger');
        return;
    }

    if (!otherUserId) {
        console.error('No chat partner specified');
        return;
    }

    const apiHost = new URL(API_BASE).host;
    const wsScheme = window.location.protocol === 'https:' ? 'wss' : 'ws';
    
    // Create room with sorted user IDs for consistency
    const userIds = [currentUser.id, otherUserId].sort((a, b) => a - b);
    const wsUrl = `${wsScheme}://${apiHost}/ws/chat/${userIds[0]}/${userIds[1]}/?token=${accessToken}`;

    if (chatSocket) {
        chatSocket.close();
    }

    chatSocket = new WebSocket(wsUrl);

    chatSocket.onopen = () => {
        console.log('WebSocket connection established');
        reconnectAttempts = 0;
        const sendButton = document.getElementById('send-button');
        if (sendButton) {
            sendButton.disabled = false;
        }
        showToast('Chat connected', 'success');
    };

    chatSocket.onmessage = (event) => {
        console.log('Received message:', event.data);
        handleWebSocketMessage(event.data);
    };

    chatSocket.onclose = (e) => {
        console.log('WebSocket connection closed:', e);
        const sendButton = document.getElementById('send-button');
        if (sendButton) {
            sendButton.disabled = true;
        }

        if (!e.wasClean) {
            reconnectAttempts++;
            const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 10000);
            console.log(`Attempting to reconnect in ${delay}ms (attempt ${reconnectAttempts})`);
            
            clearTimeout(reconnectTimeout);
            reconnectTimeout = setTimeout(() => initWebSocket(otherUserId), delay);
        }
    };

    chatSocket.onerror = (error) => {
        console.error('WebSocket error:', error);
        showToast('Chat connection error', 'danger');
    };
};

const loadChatHistory = async (otherUserId) => {
    try {
        const response = await fetchWithAuth(`${API_BASE}chat/messages/${otherUserId}/`);
        if (!response.ok) throw new Error('Failed to load chat history');
        
        const messages = await response.json();
        const chatMessages = document.getElementById('chat-messages');
        chatMessages.innerHTML = ''; // Clear existing messages
        
        messages.forEach(message => {
            appendMessage({
                sender_id: message.sender_id,
                sender_display_name: message.sender_display_name,
                content: message.content,
                timestamp: message.timestamp
            });
        });
        
        // Mark messages as read
        await fetchWithAuth(`${API_BASE}chat/messages/${otherUserId}/read/`, {
            method: 'POST'
        });
    } catch (error) {
        console.error('Error loading chat history:', error);
        showToast('Error loading chat history', 'danger');
    }
};

const startChat = async (userId, username) => {
    // Validate inputs
    if (!userId || !username) {
        console.error('Invalid chat parameters:', { userId, username });
        showToast('Unable to start chat', 'danger');
        return;
    }

    // Ensure current user is set
    if (!currentUser) {
        console.error('Current user not set');
        showToast('Please log in first', 'danger');
        return;
    }

    // Set current chat partner
    currentChatPartner = userId;
    
    // Update chat header
    const chatHeader = document.getElementById('chat-header');
    if (chatHeader) {
        chatHeader.textContent = `Chat with ${username}`;
    }
    
    // Initialize WebSocket connection
    try {
        // Close existing socket if open
        if (chatSocket) {
            chatSocket.close();
        }

        // Initialize new WebSocket
        initWebSocket(userId);
        
        // Load chat history
        await loadChatHistory(userId);
        
        // Show chat container
        const chatContainer = document.getElementById('chat-container');
        if (chatContainer) {
            chatContainer.style.display = 'block';
        }
    } catch (error) {
        console.error('Error starting chat:', error);
        showToast('Failed to start chat', 'danger');
    }
};

// Handle incoming WebSocket messages
const handleWebSocketMessage = (data) => {
    console.log('Received WebSocket data:', data);
    try {
        if (typeof data === 'string') {
            data = JSON.parse(data);
        }
        
        console.log('Parsed message data:', data);
        
        switch(data.type) {
            case 'chat_message':
                console.log('Processing chat message:', data);
                if (!document.getElementById('chat-messages')) {
                    console.error('Chat container not found when processing message');
                    return;
                }
                
                appendMessageWithLogging({
                    sender_id: data.sender_id,
                    sender_display_name: data.sender_display_name || 'Unknown User',
                    content: data.message || data.content, // Handle both possible field names
                    timestamp: data.timestamp || new Date().toISOString()
                });
                break;
                
            case 'connection_established':
                console.log('Chat connection established');
                showToast('Connected to chat', 'success');
                break;
                
            default:
                console.log('Unhandled message type:', data.type);
                break;
        }
    } catch (error) {
        console.error('Error handling WebSocket message:', error);
    }
};

// Debug logging wrapper for appendMessage
const appendMessageWithLogging = (message) => {
    console.log('Attempting to append message:', message);
    console.log('Current chat container:', document.getElementById('chat-messages'));
    appendMessage(message);
};

// Append message to chat window
const appendMessage = (message) => {
    const messagesContainer = document.getElementById('chat-messages');
    console.log('Found messages container:', messagesContainer);
    
    if (!messagesContainer) {
        console.error('Chat messages container not found');
        return;
    }

    try {
        const messageElement = document.createElement('div');
        console.log('Current user:', currentUser);
        const isCurrentUser = message.sender_id === currentUser?.id;
        
        messageElement.className = `list-group-item ${
            isCurrentUser ? 'bg-primary' : 'bg-secondary'
        } text-white mb-2`;
        
        const timestamp = new Date(message.timestamp).toLocaleTimeString();
        
        messageElement.innerHTML = `
            <div class="d-flex justify-content-between align-items-center">
                <strong>${message.sender_display_name}</strong>
                <small>${timestamp}</small>
            </div>
            <p class="mb-1 mt-1">${escapeHtml(message.content)}</p>
        `;
        
        console.log('Created message element:', messageElement);
        messagesContainer.appendChild(messageElement);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
        console.log('Message appended successfully');
    } catch (error) {
        console.error('Error appending message:', error);
    }
};

const escapeHtml = (unsafe) => {
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
};

// Block user functionality
const blockUser = async (userId) => {
    try {
        const response = await fetchWithAuth(`${API_BASE}users/block/${userId}/`, {
            method: 'POST'
        });
        
        if (response.ok) {
            blockedUsers.add(parseInt(userId));
            // Remove blocked user's messages
            document.querySelectorAll(`[data-user-id="${userId}"]`).forEach(el => {
                el.closest('.list-group-item').remove();
            });
            showToast('User blocked successfully', 'success');
        }
    } catch (error) {
        console.error('Blocking failed:', error);
        showToast('Error blocking user', 'danger');
    }
};

// Show user profile modal
const showUserProfile = async (userId) => {
    try {
        const response = await fetchWithAuth(`${API_BASE}users/${userId}/`);
        const user = await response.json();
        
        const profileContent = document.getElementById('profile-content');
        profileContent.innerHTML = `
            <div class="text-center">
                <img src="${user.avatar || 'default_avatar.png'}" 
                     class="rounded-circle mb-3" 
                     style="width: 100px; height: 100px; object-fit: cover;">
                <h4>${user.display_name}</h4>
                <p>Username: ${user.username}</p>
                ${user.is_online ? '<span class="badge bg-success">Online</span>' : ''}
            </div>
        `;
        
        new bootstrap.Modal(document.getElementById('profileModal')).show();
    } catch (error) {
        console.error('Error fetching profile:', error);
        showToast('Error loading profile', 'danger');
    }
};

const initializeChat = () => {
    console.log('Initializing chat...');
    const chatContainer = document.getElementById('chat-messages');
    if (!chatContainer) {
        console.error('Chat container not found during initialization');
        return;
    }
    
    // Clear existing messages
    chatContainer.innerHTML = '';
    
    // Add event listeners
    const messageInput = document.getElementById('message-input');
    const sendButton = document.getElementById('send-button');
    
    if (messageInput && sendButton) {
        messageInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
            }
        });
        
        sendButton.addEventListener('click', sendMessage);
    }
    
    console.log('Chat initialized successfully');
};

// Chat functionality
const initializeChatHandlers = () => {
    const sendButton = document.getElementById('send-button');
    const messageInput = document.getElementById('message-input');
    
    sendButton?.addEventListener('click', sendMessage);
    messageInput?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });
};

const handleMessageKeypress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
    }
};

// Send message handler
const sendMessage = () => {
    const messageInput = document.getElementById('message-input');
    const message = messageInput.value.trim();
    
    if (message && chatSocket && chatSocket.readyState === WebSocket.OPEN) {
        console.log('Attempting to send message:', message);
        
        const messageData = {
            type: 'chat_message',
            message: message
        };
        
        try {
            chatSocket.send(JSON.stringify(messageData));
            console.log('Message sent:', messageData);
            messageInput.value = ''; // Clear input after sending
        } catch (error) {
            console.error('Error sending message:', error);
            showToast('Error sending message', 'danger');
        }
    } else {
        console.error('Cannot send message:', {
            messageExists: !!message,
            socketExists: !!chatSocket,
            socketState: chatSocket?.readyState
        });
    }
};

const showUsersList = async () => {
    try {
        const response = await fetchWithAuth(`${API_BASE}users/`);
        const users = await response.json();
        
        const usersList = document.createElement('div');
        usersList.className = 'list-group';
        
        users
            .filter(user => user.id !== currentUser.id) // Exclude current user
            .forEach(user => {
                const userItem = document.createElement('button');
                userItem.className = 'list-group-item list-group-item-action';
                userItem.innerHTML = `
                    <div class="d-flex justify-content-between align-items-center">
                        <span>${user.username}</span>
                        <span class="badge ${user.online_status ? 'bg-success' : 'bg-secondary'} rounded-pill">
                            ${user.online_status ? 'Online' : 'Offline'}
                        </span>
                    </div>
                `;
                userItem.onclick = () => startChat(user.id, user.username);
                usersList.appendChild(userItem);
            });
            
        // Show users list in a modal
        const modalBody = document.querySelector('#usersModal .modal-body');
        modalBody.innerHTML = '';
        modalBody.appendChild(usersList);
        new bootstrap.Modal(document.getElementById('usersModal')).show();
    } catch (error) {
        console.error('Error loading users:', error);
        showToast('Error loading users list', 'danger');
    }
};

// ====================== Event Listeners ======================
document.getElementById('send-button').addEventListener('click', sendMessage);
document.getElementById('message-input').addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
    }
});

document.addEventListener('click', (e) => {
    if (e.target.closest('.block-user-btn')) {
        const userId = e.target.closest('.block-user-btn').dataset.userId;
        blockUser(userId);
    }
    
    if (e.target.closest('.user-profile-link')) {
        e.preventDefault();
        const userId = e.target.closest('.user-profile-link').dataset.userId;
        showUserProfile(userId);
    }
});

// Toggle chat visibility
document.getElementById('toggle-chat').addEventListener('click', () => {
    const chatBody = document.querySelector('#chat-container .card-body');
    const isVisible = chatBody.style.display !== 'none';
    chatBody.style.display = isVisible ? 'none' : 'block';
    document.getElementById('toggle-chat').innerHTML = 
        `<i class="bi ${isVisible ? 'bi-plus-lg' : 'bi-dash-lg'}"></i>`;
});

// UI Updates
const loadMainPage = async () => {
    showPage(pages.main);

    try {
        const profile = await fetchUserProfile();
        if (profile) {
            // Store current user information
            currentUser = profile;
            // Update profile display in nav
            document.getElementById('username-display').textContent = profile.username;
            if (profile.avatar) {
                document.getElementById('profile-avatar').src = profile.avatar;
            }

            // Update stats
            document.getElementById('player-stats').innerHTML = `
                <p>Username: ${profile.username}</p>
                <p>Email: ${profile.email}</p>
                <p>Wins: ${profile.stats?.wins || 0}</p>
                <p>Losses: ${profile.stats?.losses || 0}</p>
            `;

             // Initialize chat handlers
             console.log('Setting up chat for user:', profile.username);
             initializeChatHandlers();
            
            //  // Initialize WebSocket if not already connected
            // if (!chatSocket || chatSocket.readyState !== WebSocket.OPEN) {
            //     initWebSocket();
            // }

            // Clear chat messages container
            const messagesContainer = document.getElementById('chat-messages');
            if (messagesContainer) {
                messagesContainer.innerHTML = '';
            }
        }

        const matches = await fetchMatchHistory();

        if (matches && matches.length > 0) {
            document.getElementById('match-history').innerHTML = `
                <h5 class="text-white mb-3">Recent Matches (Last ${RECENT_MATCHES_LIMIT})</h5>
                ${matches
                    .slice(0, RECENT_MATCHES_LIMIT)
                    .map(match => {
                        const isPlayer1 = match.player1 === profile.id;
                        const playerScore = isPlayer1 ? match.player1_score : match.player2_score;
                        const opponentScore = isPlayer1 ? match.player2_score : match.player1_score;
                        
                        // Get opponent name and match type
                        const matchTypeKey = `match_${match.id}_type`;
                        const storedMatchType = localStorage.getItem(matchTypeKey);
                        const isPVP = storedMatchType === 'PVP' || match.match_type === 'PVP';

                        let opponentName;
                        if (isPVP) {
                            const matchKey = `match_${match.id}_player2`;
                            opponentName = localStorage.getItem(matchKey) || 'Player 2';
                        } else {
                            opponentName = 'Computer';
                        }

                        const matchDate = new Date(match.end_time).toLocaleDateString();
                        const matchTypeDisplay = isPVP ? 'PVP Match' : 'AI Match';

                        return `
                            <div class="mb-3 text-white">
                                <div>${matchTypeDisplay}: You vs ${opponentName}</div>
                                <div>Score: ${playerScore}-${opponentScore}</div>
                                <small class="text-muted">${matchDate}</small>
                            </div>
                        `;
                    }).join('')}
            `;
        } else {
            document.getElementById('match-history').innerHTML = '<p class="text-white">No matches found</p>';
        }
    } catch (error) {
        console.error('Error loading main page:', error);
        if (error.message.includes('401')) {
            window.location.href = '/';
        }
    }
};

const showToast = (message, type = 'info') => {
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
};

// Event Listeners
document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const [username, password] = e.target.querySelectorAll('input');
    await handleLogin(username.value, password.value);
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
    await handleRegister(userData);
});

document.getElementById('logout-btn').addEventListener('click', () => {
    // Clear any pending reconnection attempts
    clearTimeout(reconnectTimeout);
    reconnectAttempts = 0;
    
    // Close WebSocket connection if it exists
    if (chatSocket) {
        chatSocket.close();
        chatSocket = null;
    }
    
    // Clear storage and reset variables
    localStorage.clear();
    accessToken = null;
    currentChatUser = null;
    
    // Show landing page
    showPage(pages.landing);
});

// Profile Event Listeners
const userProfileElement = document.getElementById('user-profile');
userProfileElement.removeEventListener('click', loadUpdateProfilePage);
userProfileElement.addEventListener('click', loadUpdateProfilePage);
document.getElementById('back-to-main').addEventListener('click', async (e) => {
    e.preventDefault();
    await loadMainPage(); // Use loadMainPage instead of showPage
});
document.getElementById('update-profile-form').addEventListener('submit', handleUpdateProfile);

// Form Toggle
const toggleForms = () => {
    document.getElementById('login-form').classList.toggle('d-none');
    document.getElementById('register-form').classList.toggle('d-none');
};

document.getElementById('register-link').addEventListener('click', toggleForms);
document.getElementById('login-link').addEventListener('click', toggleForms);

// OAuth Login
document.getElementById('oauth-login-link').addEventListener('click', (e) => {
    e.preventDefault(); // Prevent the default anchor behavior
    window.location.href = `${API_BASE}auth/oauth/login/`; // Redirect to the OAuth login endpoint
});

// Game Controls
document.getElementById('play-player-btn').addEventListener('click', async () => {
    if (!accessToken) {
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
    if (!accessToken) {
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
                Authorization: `Bearer ${accessToken}`
            },
            body: JSON.stringify({ name: 'New Tournament', participants: [] })
        });
        
        if (!response.ok) throw new Error('Tournament creation failed');
        alert('Tournament created successfully!');
    } catch (error) {
        alert(error.message);
    }
});

// Initialization
if (accessToken) {
    loadMainPage();
} else {
    showPage(pages.landing);
}

// Make refreshAccessToken available globally
window.refreshAccessToken = refreshAccessToken;