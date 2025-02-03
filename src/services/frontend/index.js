const API_BASE = 'https://localhost/api/';
let accessToken = localStorage.getItem('accessToken');
const RECENT_MATCHES_LIMIT = 5;

// DOM Elements
const pages = {
    landing: document.getElementById('landing-page'),
    main: document.getElementById('main-page')
};

const showPage = (page) => {
    Object.values(pages).forEach(p => p.classList.remove('active-page'));
    page.classList.add('active-page');
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
        localStorage.setItem('accessToken', data.access);
        localStorage.setItem('refreshToken', data.refresh);
        accessToken = data.access;
        loadMainPage();
    } catch (error) {
        alert(error.message);
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

// Add refresh token functionality
const refreshAccessToken = async () => {
    try {
        const refreshToken = localStorage.getItem('refreshToken');
        if (!refreshToken) throw new Error('No refresh token');

        const response = await fetch(`${API_BASE}auth/refresh/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refresh: refreshToken })
        });

        if (!response.ok) throw new Error('Token refresh failed');
        
        const data = await response.json();
        localStorage.setItem('accessToken', data.access);
        accessToken = data.access;
        return data.access;
    } catch (error) {
        console.error('Error refreshing token:', error);
        localStorage.clear();
        accessToken = null;
        showPage(pages.landing);
        throw error;
    }
};

// Data Fetching
const fetchUserProfile = async () => {
    try {
        const response = await fetch(`${API_BASE}users/profile/`, {
            headers: { 
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            }
        });

        if (response.status === 401) {
            // Try to refresh token and retry the request
            const newToken = await refreshAccessToken();
            const retryResponse = await fetch(`${API_BASE}users/profile/`, {
                headers: { 
                    Authorization: `Bearer ${newToken}`,
                    'Content-Type': 'application/json'
                }
            });
            
            if (!retryResponse.ok) throw new Error(`HTTP error! status: ${retryResponse.status}`);
            return await retryResponse.json();
        }

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

        const response = await fetch(`${API_BASE}matches/`, {
            headers: { 
                Authorization: `Bearer ${accessToken}`
            }
        });
        
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

// Form Toggle
const toggleForms = () => {
    document.getElementById('login-form').classList.toggle('d-none');
    document.getElementById('register-form').classList.toggle('d-none');
};

document.getElementById('register-link').addEventListener('click', toggleForms);
document.getElementById('login-link').addEventListener('click', toggleForms);

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