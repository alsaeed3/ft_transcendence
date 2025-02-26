import { AuthManager } from './authManager.js';
import { ChatManager } from './chatManager.js';
import { ProfileManager } from './profileManager.js';


export class UIManager {
    static pages = {
        login: '#/',
        register: '#/register',
        home: '#/home',
        profile: '#/profile',
        twoFactor: '#/2fa',
        pongPVP: '#/pong/pvp',
        pongAI: '#/pong/ai',
        pongTournament: '#/pong/tournament',
        tournamentSetup: '#/tournament-setup',
        playerSetup: '#/player-setup',
        territory: '#/territory',
        pong4Player: '#/pong4'
    };

    static showPage(pageHash) {
        window.location.hash = pageHash;
    }

    static showLoginForm() {
        this.showPage(this.pages.login);
    }

    static async loadMainPage() {
        try {
            // Load user profile
            const profile = await ProfileManager.fetchUserProfile();
            if (!profile) throw new Error('Failed to load user profile');

            // Update UI elements
            const usernameDisplay = document.getElementById('username-display');
            const profileAvatar = document.getElementById('profile-avatar');
            
            if (usernameDisplay) {
                usernameDisplay.textContent = profile.username;
            }
            
            if (profileAvatar) {
                profileAvatar.src = profile.avatar_url || '/media/avatars/default.svg';
                profileAvatar.onerror = () => {
                    profileAvatar.src = '/media/avatars/default.svg';
                };
            }

            // Load user stats
            await this.loadUserStats();

            // Load recent matches for the home page
            await this.loadHomePageMatches();

            // Initialize WebSocket connection
            ChatManager.initStatusWebSocket();

        } catch (error) {
            console.error('Error loading main page:', error);
            this.showToast('Failed to load user data', 'danger');
        }
    }

    static async loadUserStats() {
        try {
            const response = await AuthManager.fetchWithAuth(`${AuthManager.API_BASE}users/profile/${AuthManager.currentUser?.id}/`);
            if (!response.ok) throw new Error('Failed to fetch user stats');

            const stats = await response.json();

            // Update stats in the UI
            const statsUsername = document.getElementById('stats-username');
            const matchWins = document.getElementById('stats-match-wins');
            const totalMatches = document.getElementById('stats-total-matches');
            const totalTourneys = document.getElementById('stats-total-tourneys');

            if (statsUsername) statsUsername.textContent = stats.username;
            if (matchWins) matchWins.textContent = stats.match_wins || '0';
            if (totalMatches) totalMatches.textContent = stats.total_matches || '0';
            if (totalTourneys) totalTourneys.textContent = stats.total_tourneys || '0';

        } catch (error) {
            console.error('Error loading user stats:', error);
            // Set default values if stats fail to load
            const statsUsername = document.getElementById('stats-username');
            const matchWins = document.getElementById('stats-match-wins');
            const totalMatches = document.getElementById('stats-total-matches');
            const totalTourneys = document.getElementById('stats-total-tourneys');

            if (statsUsername) statsUsername.textContent = AuthManager.currentUser?.username || 'Unknown';
            if (matchWins) matchWins.textContent = '0';
            if (totalMatches) totalMatches.textContent = '0';
            if (totalTourneys) totalTourneys.textContent = '0';

            this.showToast('Failed to load user statistics', 'danger');
        }
    }

    static async loadHomePageMatches() {
        try {
            const matchHistory = document.getElementById('match-history');
            if (!matchHistory) return;

            const response = await AuthManager.fetchWithAuth(`${AuthManager.API_BASE}matches/history/${AuthManager.currentUser?.id}/`);
            if (!response.ok) throw new Error('Failed to fetch matches');

            const matches = await response.json();

            if (!matches.length) {
                matchHistory.innerHTML = '<p class="text-muted">No recent matches</p>';
                return;
            }

            matchHistory.innerHTML = matches
                .slice(0, 5)
                .map(match => {
                    const winner = match.winner_name;
                    const player1Class = match.player1_name === winner ? 'text-success' : 'text-danger';
                    const player2Class = match.player2_name === winner ? 'text-success' : 'text-danger';

                    return `
                        <div class="match-history-item p-2 mb-2">
                            <div class="text-center mb-2">
                                <span class="${player1Class} fw-bold">${match.player1_name}</span>
                                <span class="text-warning"> X </span>
                                <span class="${player2Class} fw-bold">${match.player2_name}</span>
                            </div>
                            <div class="text-center fw-bold">
                                Score: ${match.player1_score} - ${match.player2_score}
                            </div>
                            <div class="text-center mt-1 small text-white">
                                ${new Date(match.end_time || match.start_time).toLocaleDateString('en-US', {
                                    month: 'short',
                                    day: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                })}
                            </div>
                        </div>
                    `;
                })
                .join('');

        } catch (error) {
            console.error('Error loading home page matches:', error);
            const matchHistory = document.getElementById('match-history');
            if (matchHistory) {
                matchHistory.innerHTML = '<p class="text-danger">Failed to load matches</p>';
            }
        }
    }

    static async loadUpdateProfilePage() {
        try {
            const profile = await ProfileManager.fetchUserProfile();
            if (!profile) throw new Error('Failed to load profile');

            // Update form fields
            const emailInput = document.getElementById('email');
            const usernameInput = document.getElementById('username');
            const currentAvatarImg = document.getElementById('current-avatar');
            const is2FAEnabled = document.getElementById('is-2fa-enabled');
            const twoFAToggleBtn = document.getElementById('2fa-toggle-btn');

            if (emailInput) emailInput.value = profile.email || '';
            if (usernameInput) usernameInput.value = profile.username || '';
            
            if (currentAvatarImg) {
                currentAvatarImg.src = profile.avatar_url || '/media/avatars/default.svg';
                currentAvatarImg.onerror = () => {
                    currentAvatarImg.src = '/media/avatars/default.svg';
                };
            }

            if (is2FAEnabled) {
                is2FAEnabled.textContent = profile.is_2fa_enabled ? 'Enabled' : 'Disabled';
            }

            if (twoFAToggleBtn) {
                twoFAToggleBtn.textContent = profile.is_2fa_enabled ? 'Disable 2FA' : 'Enable 2FA';
            }

            // Handle 42 School authentication
            if (profile.is_42_auth) {
                const emailField = document.querySelector('.email-field');
                const usernameField = document.querySelector('.username-field');
                const avatarField = document.querySelector('.avatar-field');
                const twoFAField = document.querySelector('.twofa-field');

                if (emailField) emailField.style.display = 'none';
                if (usernameField) usernameField.style.display = 'none';
                if (avatarField) avatarField.style.display = 'none';
                if (twoFAField) twoFAField.style.display = 'none';

                const notice = document.createElement('div');
                notice.className = 'alert alert-info';
                notice.textContent = 'Profile management is handled through 42 School authentication.';
                document.getElementById('update-profile-form')?.prepend(notice);
            }

        } catch (error) {
            console.error('Error loading profile page:', error);
            this.showToast('Failed to load profile data', 'danger');
        }
    }

    static showToast(message, type = 'success') {
        const toastContainer = document.querySelector('.toast-container');
        if (!toastContainer) return;

        const toast = document.createElement('div');
        toast.className = `toast align-items-center text-white bg-${type} border-0`;
        toast.setAttribute('role', 'alert');
        toast.setAttribute('aria-live', 'assertive');
        toast.setAttribute('aria-atomic', 'true');

        toast.innerHTML = `
            <div class="d-flex">
                <div class="toast-body">
                    ${message}
                </div>
                <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
            </div>
        `;

        toastContainer.appendChild(toast);
        const bsToast = new bootstrap.Toast(toast);
        bsToast.show();

        toast.addEventListener('hidden.bs.toast', () => {
            toast.remove();
        });
    }

    static toggleForms() {
        const loginForm = document.getElementById('login-form');
        const registerForm = document.getElementById('register-form');
        
        if (loginForm && registerForm) {
            if (loginForm.classList.contains('d-none')) {
                loginForm.classList.remove('d-none');
                registerForm.classList.add('d-none');
                window.location.hash = '#/';
            } else {
                loginForm.classList.add('d-none');
                registerForm.classList.remove('d-none');
                window.location.hash = '#/register';
            }
        }
    }

    static makeUsernameClickable(element, userId, username) {
        if (!element || !userId || !username) return;

        element.style.cursor = 'pointer';
        element.style.textDecoration = 'underline';
        
        element.addEventListener('click', async () => {
            try {
                await this.showUserProfile(userId, username);
            } catch (error) {
                console.error('Error showing user profile:', error);
                this.showToast('Failed to load user profile', 'danger');
            }
        });
    }

    static async loadUserRecentMatches(userId) {
        try {
            const response = await AuthManager.fetchWithAuth(`${AuthManager.API_BASE}matches/history/${userId}/`);
            if (!response.ok) throw new Error('Failed to fetch matches');

            const matches = await response.json();
            const matchesList = document.querySelector('#modal-recent-matches .matches-list');
            
            if (!matchesList) return;

            if (!matches.length) {
                matchesList.innerHTML = '<p class="text-muted">No recent matches</p>';
                return;
            }

            matchesList.innerHTML = matches
                .slice(0, 5)
                .map(match => {
                    const date = new Date(match.end_time || match.start_time);
                    const formattedDate = date.toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                    });

                    return `
                        <div class="match-item p-2">
                            <div class="d-flex justify-content-between align-items-center">
                                <div>
                                    <span class="clickable-username" data-user-id="${match.player1_id}">
                                        ${match.player1_name}
                                    </span>
                                    VS
                                    <span class="clickable-username" data-user-id="${match.player2_id}">
                                        ${match.player2_name}
                                    </span>
                                </div>
                                <small class="text-muted">${formattedDate}</small>
                            </div>
                            <div class="mt-1">
                                Score: ${match.player1_score} - ${match.player2_score}
                                <span class="text-success ms-2">
                                    Winner: ${match.winner_name}
                                </span>
                            </div>
                        </div>
                    `;
                })
                .join('');

            // Make usernames in match history clickable
            matchesList.querySelectorAll('.clickable-username').forEach(element => {
                const userId = element.getAttribute('data-user-id');
                const username = element.textContent.trim();
                this.makeUsernameClickable(element, userId, username);
            });

        } catch (error) {
            console.error('Error loading matches:', error);
            const matchesList = document.querySelector('#modal-recent-matches .matches-list');
            if (matchesList) {
                matchesList.innerHTML = '<p class="text-danger">Failed to load matches</p>';
            }
        }
    }

    static async showUserProfile(userId, username) {
        try {
            // Fetch user data
            const response = await AuthManager.fetchWithAuth(`${AuthManager.API_BASE}users/${userId}/`);
            if (!response.ok) throw new Error('Failed to fetch user profile');
            const userData = await response.json();

            // Get online status from ChatManager
            const isOnline = ChatManager.onlineUsers.has(parseInt(userId));

            // Fetch user stats - using the same endpoint as loadUserStats()
            const statsResponse = await AuthManager.fetchWithAuth(`${AuthManager.API_BASE}users/profile/${userId}/`);
            if (!statsResponse.ok) throw new Error('Failed to fetch user stats');
            const stats = await statsResponse.json();

            // Fetch recent matches
            const matchesResponse = await AuthManager.fetchWithAuth(`${AuthManager.API_BASE}matches/history/${userId}/`);
            if (!matchesResponse.ok) throw new Error('Failed to fetch matches');
            const matches = await matchesResponse.json();

            const modalContent = `
                <div class="modal-header bg-dark text-light border-secondary">
                    <h5 class="modal-title">User Profile</h5>
                    <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                </div>
                <div class="modal-body bg-dark text-light">
                    <div class="text-center mb-4">
                        <img src="${userData.avatar_url || '/media/avatars/default.svg'}" 
                             alt="${userData.username}" 
                             class="rounded-circle mb-3"
                             style="width: 128px; height: 128px;"
                             onerror="this.src='/media/avatars/default.svg'">
                        <h4>${userData.username}</h4>
                        <div class="d-flex align-items-center justify-content-center gap-2">
                            <span class="status-indicator" 
                                  data-user-status="${userId}" 
                                  style="width: 10px; height: 10px; border-radius: 50%; display: inline-block; background-color: ${isOnline ? '#198754' : '#6c757d'}">
                            </span>
                            <span class="badge" 
                                  data-user-status="${userId}" 
                                  style="background-color: ${isOnline ? '#198754' : '#6c757d'}">
                                ${isOnline ? 'Online' : 'Offline'}
                            </span>
                        </div>
                    </div>

                    <div class="stats-section mb-4">
                        <h5 class="text-light mb-3">Player Stats</h5>
                        <div class="row text-center">
                            <div class="col-4">
                                <div class="stat-value">${stats.match_wins || '0'}</div>
                                <div class="stat-label">Match Wins</div>
                            </div>
                            <div class="col-4">
                                <div class="stat-value">${stats.total_matches || '0'}</div>
                                <div class="stat-label">Total Matches</div>
                            </div>
                            <div class="col-4">
                                <div class="stat-value">${stats.total_tourneys || '0'}</div>
                                <div class="stat-label">Total Tourneys</div>
                            </div>
                        </div>
                    </div>

                    <div id="modal-recent-matches" class="mt-4">
                        <h5 class="mb-3">Recent Matches</h5>
                        <div class="matches-list">
                            ${matches.slice(0, 5).map(match => {
                                const date = new Date(match.end_time || match.start_time);
                                const formattedDate = date.toLocaleDateString('en-US', {
                                    month: 'short',
                                    day: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                });

                                return `
                                    <div class="match-history-item p-2 mb-2">
                                        <div class="text-center mb-2">
                                            <span class="${match.player1_name === match.winner_name ? 'text-success' : 'text-danger'} fw-bold">
                                                ${match.player1_name}
                                            </span>
                                            <span class="text-warning"> X </span>
                                            <span class="${match.player2_name === match.winner_name ? 'text-success' : 'text-danger'} fw-bold">
                                                ${match.player2_name}
                                            </span>
                                        </div>
                                        <div class="text-center fw-bold">
                                            Score: ${match.player1_score} - ${match.player2_score}
                                        </div>
                                        <div class="text-center mt-1 small text-white">
                                            ${formattedDate}
                                        </div>
                                    </div>
                                `;
                            }).join('')}
                        </div>
                    </div>
                </div>
            `;

            const modalElement = document.getElementById('userProfileModal');
            if (!modalElement) {
                const modal = document.createElement('div');
                modal.className = 'modal fade';
                modal.id = 'userProfileModal';
                modal.setAttribute('tabindex', '-1');
                modal.innerHTML = `
                    <div class="modal-dialog modal-dialog-centered">
                        <div class="modal-content">
                            ${modalContent}
                        </div>
                    </div>
                `;
                document.body.appendChild(modal);
            } else {
                modalElement.querySelector('.modal-content').innerHTML = modalContent;
            }

            const userProfileModal = new bootstrap.Modal(document.getElementById('userProfileModal'));
            userProfileModal.show();

        } catch (error) {
            console.error('Error showing user profile:', error);
            this.showToast('Failed to load user profile', 'danger');
        }
    }
} 