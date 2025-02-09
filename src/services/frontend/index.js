const API_BASE = 'https://localhost/api/';
var username;
let accessToken = localStorage.getItem('accessToken');
let refreshToken = localStorage.getItem('refreshToken');
const RECENT_MATCHES_LIMIT = 5;
const TOKEN_REFRESH_THRESHOLD = 30 * 60 * 1000; // 30 minutes in milliseconds
let currentOTPTimer = null; // For tracking OTP timer

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

        if (!refreshToken) {
            throw new Error("No refresh token available");
        }

        const response = await fetch(`${API_BASE}token/refresh/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refresh: refreshToken })
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            console.error("Token refresh response error:", errorData);
            throw new Error(`Token refresh failed: ${errorData.error || response.statusText}`);
        }
        
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
    if (!accessToken) {
        throw new Error('No access token available');
    }

    let response = await fetch(url, {
        ...options,
        headers: {
            ...options.headers,
            'Authorization': `Bearer ${accessToken}`
        }
    });

    if (response.status === 401) {
        if (!refreshToken) {
            throw new Error('Session expired. Please login again.');
        }
        
        try {
            const newToken = await refreshAccessToken();
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
            showPage(pages.landing);
            throw new Error('Session expired. Please login again.');
        }
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
        
        const data = await response.json();

        // Check specifically for 2FA requirement
        if (response.status === 202 && data['2fa_required']) {
            // Store email for OTP verification
            sessionStorage.setItem('tempUserEmail', data.user.email);
            // Switch to 2FA form
            document.getElementById('login-form').classList.add('d-none');
            document.getElementById('register-form').classList.add('d-none');
            document.getElementById('2fa-form').classList.remove('d-none');
            startOTPTimer();
            return;
        }

        if (!response.ok) {
            throw new Error(data.error || 'Login failed');
        }

        // Only store tokens and proceed if no 2FA required
        processSuccessfulAuth(data);
    } catch (error) {
        console.error('Login error:', error);
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

        alert('Registration successful! Please login.');
        toggleForms();
    } catch (error) {
        // Create formatted alert message
        const errorLines = error.message.split('\n');
        const formattedError = errorLines.join('\n');
        alert(formattedError);
    }
};

// Add these new functions for 2FA handling
const startOTPTimer = () => {
    // Clear any existing timer
    if (currentOTPTimer) {
        clearInterval(currentOTPTimer);
    }

    const timerElement = document.getElementById('otp-timer');
    let timeLeft = 300; // 5 minutes in seconds

    currentOTPTimer = setInterval(() => {
        const minutes = Math.floor(timeLeft / 60);
        const seconds = timeLeft % 60;
        timerElement.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
        
        if (timeLeft <= 0) {
            clearInterval(currentOTPTimer);
            currentOTPTimer = null;
            alert('OTP expired. Please try again.');
            showLoginForm();
        }
        timeLeft--;
    }, 1000);
};

const verify2FA = async (otp) => {
    try {
        const email = sessionStorage.getItem('tempUserEmail');
        if (!email) {
            throw new Error('Session expired. Please login again.');
        }

        const response = await fetch(`${API_BASE}auth/2fa/verify/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, otp })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Invalid or expired OTP');
        }

        // Process successful verification
        processSuccessfulAuth(data);
    } catch (error) {
        console.error('2FA verification error:', error);
        alert(error.message);
    }
};

// Helper function to process successful authentication
const processSuccessfulAuth = (data) => {
    if (!data.access || !data.refresh) {
        throw new Error('Invalid authentication response');
    }
    
    // Store tokens
    accessToken = data.access;
    refreshToken = data.refresh;
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);
    
    // Clear any 2FA temporary data
    sessionStorage.removeItem('tempUserEmail');
    
    // Navigate to main page
    showPage(pages.main);
    loadMainPage();
};

// Modify the showLoginForm function to handle form visibility properly
const showLoginForm = () => {
    document.getElementById('2fa-form').classList.add('d-none');
    document.getElementById('login-form').classList.remove('d-none');
    document.getElementById('register-form').classList.add('d-none');
    if (currentOTPTimer) {
        clearInterval(currentOTPTimer);
        currentOTPTimer = null;
    }
    sessionStorage.removeItem('tempUserEmail');
};

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

// Add these friend-related functions
const fetchFriendList = async () => {
    try {
        const response = await fetchWithAuth(`${API_BASE}users/friends/`);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        return await response.json();
    } catch (error) {
        console.error('Error fetching friend list:', error);
        return [];
    }
};

const addFriend = async (username) => {
    try {
        // First, search for the user by username
        const searchResponse = await fetchWithAuth(`${API_BASE}users/?username=${username}`);
        if (!searchResponse.ok) {
            throw new Error('Failed to find user');
        }
        
        const users = await searchResponse.json();
        if (!Array.isArray(users) || users.length === 0) {
            throw new Error('User not found');
        }

        const user = users[0]; // Get the first matching user

        // Now send the friend request using the found user's ID
        const response = await fetchWithAuth(`${API_BASE}users/${user.id}/friend-request/`, {
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
        alert(error.message);
    }
};

const removeFriend = async (userId) => {
    try {
        const response = await fetchWithAuth(`${API_BASE}users/${userId}/unfriend/`, {
            method: 'DELETE'
        });

        if (!response.ok) {
            throw new Error('Failed to remove friend');
        }
        await updateFriendListUI();
    } catch (error) {
        alert(error.message);
    }
};

const updateFriendListUI = async () => {
    const friends = await fetchFriendList();
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
                await removeFriend(friendId);
            }
        });
    });
};

// Profile Management
const loadUpdateProfilePage = async () => {
    showPage(pages.updateProfile);
    try {
        const profile = await fetchUserProfile();
        console.log('Profile data:', profile); // Add this line for debugging
        document.getElementById('update-username').value = profile.username;
        document.getElementById('update-email').value = profile.email;
        
        const is42User = profile.is_42_auth;
        const statusElement = document.getElementById('2fa-status');
        const twoFAToggleForm = document.getElementById('2fa-toggle-form');
        
        // Log the 2FA status for debugging
        console.log('2FA enabled:', profile.is_2fa_enabled);
        
        if (is42User) {
            statusElement.innerHTML = `
                <div class="alert alert-info text-center">
                    <strong>2FA is managed by 42 School authentication</strong>
                </div>
            `;
            twoFAToggleForm.style.display = 'none';
        } else {
            const is2FAEnabled = Boolean(profile.is_2fa_enabled); // Ensure boolean value
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

// Add this new function for 2FA toggle
const handle2FAToggle = async (e) => {
    e.preventDefault();
    
    try {
        const profile = await fetchUserProfile();
        if (profile.is_42_auth) {
            alert('2FA settings cannot be modified for 42 School users.');
            return;
        }

        const password = document.getElementById('2fa-password').value;
        const response = await fetchWithAuth(`${API_BASE}auth/2fa/toggle/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ password })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to toggle 2FA');
        }

        const data = await response.json();
        document.getElementById('2fa-password').value = ''; // Clear password field
        await loadUpdateProfilePage(); // Reload the page to update 2FA status
        alert(data.message || '2FA status updated successfully');
    } catch (error) {
        console.error('Error toggling 2FA:', error);
        alert(error.message);
    }
};

// UI Updates
const loadMainPage = async () => {
    showPage(pages.main);

    try {
        const profile = await fetchUserProfile();
        if (profile) {
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

        // Add this at the end of the try block
        await updateFriendListUI();
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
    const userData = {
        username: document.getElementById('register-username').value,
        email: document.getElementById('register-email').value,
        password: document.getElementById('register-password').value,
        repeat_password: document.getElementById('register-repeat-password').value
    };
    await handleRegister(userData);
});

// Modify the logout event listener
document.getElementById('logout-btn').addEventListener('click', () => {
    localStorage.clear();
    sessionStorage.clear();
    accessToken = null;
    refreshToken = null;
    if (currentOTPTimer) {
        clearInterval(currentOTPTimer);
        currentOTPTimer = null;
    }
    showLoginForm();
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

// Add this with your other event listeners
document.getElementById('2fa-toggle-form').addEventListener('submit', handle2FAToggle);

// Form Togglenessary
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

// Add these event listeners at the bottom of your file
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

    // Add friend button handler
    const addFriendBtn = document.getElementById('add-friend-btn');
    if (addFriendBtn) {
        addFriendBtn.addEventListener('click', async () => {
            const username = prompt('Enter username to add as friend:');
            if (username) {
                await addFriend(username);
            }
        });
    }

    // Add 2FA toggle form handler
    const twoFAToggleForm = document.getElementById('2fa-toggle-form');
    if (twoFAToggleForm) {
        twoFAToggleForm.addEventListener('submit', handle2FAToggle);
    }
});

// Initialization
if (accessToken) {
    loadMainPage();
} else {
    showPage(pages.landing);
}