const API_BASE = 'https://localhost/api/';
var username;
let accessToken = localStorage.getItem('accessToken');
let refreshToken = localStorage.getItem('refreshToken');
const RECENT_MATCHES_LIMIT = 5;

// DOM Elements
const pages = {
    landing: document.getElementById('landing-page'),
    main: document.getElementById('main-page'),
    updateProfile: document.getElementById('update-profile-page')
};

const showPage = (page) => {
    Object.values(pages).forEach(p => p.classList.remove('active-page'));
    page.classList.add('active-page');
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
    const profile = await fetchUserProfile();
    document.getElementById('update-username').value = profile.username;
    document.getElementById('update-email').value = profile.email;
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
const initWebSocket = () => {
    const wsScheme = window.location.protocol === 'https:' ? 'wss' : 'ws';
    const wsUrl = `${wsScheme}://${window.location.host}/ws/chat/?token=${accessToken}`;
    
    console.log('Connecting to WebSocket:', wsUrl);
    
    chatSocket = new WebSocket(wsUrl);

    chatSocket.onopen = () => {
        console.log('WebSocket connection established');
        // Enable the send button once connected
        const sendButton = document.getElementById('send-button');
        if (sendButton) {
            sendButton.disabled = false;
        }
    };

    chatSocket.onmessage = (event) => {
        console.log('Received message:', event.data);
        try {
            const data = JSON.parse(event.data);
            handleWebSocketMessage(data);
        } catch (error) {
            console.error('Error parsing WebSocket message:', error);
        }
    };

    chatSocket.onclose = (e) => {
        console.log('WebSocket connection closed:', e);
        // Disable the send button when disconnected
        const sendButton = document.getElementById('send-button');
        if (sendButton) {
            sendButton.disabled = true;
        }
        if (!e.wasClean) {
            setTimeout(initWebSocket, 5000);
        }
    };

    chatSocket.onerror = (error) => {
        console.error('WebSocket error:', error);
    };
};

// Handle incoming WebSocket messages
const handleWebSocketMessage = (data) => {
    console.log('Processing message:', data);
    
    switch(data.type) {
        case 'chat_message':
            appendMessage({
                sender_id: data.sender_id,
                sender_display_name: data.sender_display_name,
                content: data.message,
                timestamp: data.timestamp
            });
            break;
        case 'connection_established':
            console.log('Chat connection established');
            showToast('Connected to chat', 'success');
            break;
        case 'error':
            console.error('WebSocket error:', data.message);
            showToast(data.message, 'danger');
            break;
    }
};

// Append message to chat window
const appendMessage = (message) => {
    const messagesContainer = document.getElementById('chat-messages');
    if (!messagesContainer) {
        console.error('Chat messages container not found');
        return;
    }

    const messageElement = document.createElement('div');
    const isCurrentUser = message.sender_id === currentUser?.id;
    
    messageElement.className = `list-group-item list-group-item-action ${
        isCurrentUser ? 'bg-primary' : 'bg-dark'
    } text-white`;
    
    messageElement.innerHTML = `
        <div class="d-flex justify-content-between align-items-center">
            <strong>${message.sender_display_name}</strong>
            <small>${new Date(message.timestamp).toLocaleTimeString()}</small>
        </div>
        <p class="mb-1">${message.content}</p>
    `;
    
    messagesContainer.appendChild(messageElement);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
    console.log('Message appended to chat');
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
        console.log('Sending message:', message);
        
        const messageData = {
            type: 'chat_message',
            message: message
        };
        
        try {
            chatSocket.send(JSON.stringify(messageData));
            messageInput.value = ''; // Clear input after sending
        } catch (error) {
            console.error('Error sending message:', error);
            showToast('Error sending message', 'danger');
        }
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
            document.getElementById('player-stats').innerHTML = `
                <p>Username: ${profile.username}</p>
                <p>Wins: ${profile.stats?.wins || 0}</p>
                <p>Losses: ${profile.stats?.losses || 0}</p>
            `;

             // Initialize chat handlers
             initializeChatHandlers();
            
             // Initialize WebSocket if not already connected
             if (!chatSocket || chatSocket.readyState !== WebSocket.OPEN) {
                 initWebSocket();
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
        console.error('Error loading main page data:', error);
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
    // Close WebSocket connection if it exists
    if (chatSocket && chatSocket.readyState === WebSocket.OPEN) {
        chatSocket.close();
    }
    
    // Clear storage and reset variables
    localStorage.clear();
    accessToken = null;
    currentChatUser = null;
    
    // Show landing page
    showPage(pages.landing);
});

// Profile Event Listeners
document.getElementById('user-profile').addEventListener('click', loadUpdateProfilePage);
document.getElementById('back-to-main').addEventListener('click', (e) => {
    e.preventDefault();
    showPage(pages.main);
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