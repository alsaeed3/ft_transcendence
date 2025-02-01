const API_BASE = 'https://localhost/api/';
let accessToken = localStorage.getItem('accessToken');

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

// Data Fetching
const fetchUserProfile = async () => {
    try {
        const response = await fetch(`${API_BASE}users/profile/`, {
            headers: { Authorization: `Bearer ${accessToken}` }
        });
        return await response.json();
    } catch (error) {
        console.error('Error fetching profile:', error);
    }
};

const fetchMatchHistory = async () => {
    try {
        const response = await fetch(`${API_BASE}matches/`, {
            headers: { Authorization: `Bearer ${accessToken}` }
        });
        return await response.json();
    } catch (error) {
        console.error('Error fetching matches:', error);
    }
};

// UI Updates
const loadMainPage = async () => {
    showPage(pages.main);
    
    // Load user stats
    const profile = await fetchUserProfile();
    document.getElementById('player-stats').innerHTML = `
        <p>Username: ${profile.username}</p>
        <p>Wins: ${profile.stats?.wins || 0}</p>
        <p>Losses: ${profile.stats?.losses || 0}</p>
    `;

    // Load match history
    const matches = await fetchMatchHistory();
    document.getElementById('match-history').innerHTML = matches
        .slice(0, 5)
        .map(match => `
            <div class="mb-2">
                ${match.player1} vs ${match.player2}<br>
                Score: ${match.player1_score}-${match.player2_score}
            </div>
        `).join('');
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
document.getElementById('play-player-btn').addEventListener('click', () => {
    // Implement game start logic
    alert('Starting player vs player match!');
});

document.getElementById('play-ai-btn').addEventListener('click', () => {
    // Implement AI match logic
    alert('Starting AI match!');
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