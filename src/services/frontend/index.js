const API_BASE = 'https://localhost/api/';
var username;
let accessToken = localStorage.getItem('accessToken');
let refreshToken = localStorage.getItem('refreshToken');
const RECENT_MATCHES_LIMIT = 5;
const TOKEN_REFRESH_THRESHOLD = 30 * 60 * 1000; // 30 minutes in milliseconds

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
        // Check if we have a valid token that doesn't need refresh yet
        if (accessToken && refreshToken) {
            const payload = JSON.parse(atob(accessToken.split('.')[1]));
            const timeUntilExpiry = payload.exp * 1000 - Date.now();
            
            if (timeUntilExpiry > TOKEN_REFRESH_THRESHOLD) {
                return accessToken;
            }
        }

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
        console.error('Token refresh failed:', error);
        localStorage.clear();
        showPage(pages.landing);
        throw error;
    }
};

const fetchWithAuth = async (url, options = {}) => {
    try {
        // Get fresh token if needed
        accessToken = await refreshAccessToken();

        const response = await fetch(url, {
            ...options,
            headers: {
                ...options.headers,
                'Authorization': `Bearer ${accessToken}`
            }
        });

        if (response.status === 401) {
            localStorage.clear();
            window.location.href = '/';
            return;
        }

        return response;
    } catch (error) {
        console.error('Request failed:', error);
        throw error;
    }
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
        showPage(pages.main);
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

// UI Updates
const loadMainPage = async () => {
    showPage(pages.main);

    try {
        const profile = await fetchUserProfile();
        if (profile) {
            document.getElementById('player-stats').innerHTML = `
                <p>Username: ${profile.username}</p>
                <p>Wins: ${profile.stats?.wins || 0}</p>
                <p>Losses: ${profile.stats?.losses || 0}</p>
            `;
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
    localStorage.clear();
    accessToken = null;
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
    if (!accessToken) {
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
                alert('Failed to start tournament');
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
        alert('Failed to load the tournament setup');
    }
});

// Initialization
if (accessToken) {
    loadMainPage();
} else {
    showPage(pages.landing);
}