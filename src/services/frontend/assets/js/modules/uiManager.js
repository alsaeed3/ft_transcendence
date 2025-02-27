import { AuthManager } from './authManager.js';
import { ChatManager } from './chatManager.js';
import { ProfileManager } from './profileManager.js';
import { FriendManager } from './friendManager.js';
import { UserManager } from './userManager.js';
import { MatchManager } from './matchManager.js';
import { router } from './router.js';


export class UIManager {
    static pages = {
        login: '#/',
        register: '#/register',
        twoFactor: '#/2fa',
        home: '#/home',
        profile: '#/profile',
        playerSetup: '#/player-setup',
        pongPVP: '#/pong/pvp',
        pongAI: '#/pong/ai',
        pongTournament: '#/pong/tournament',
        tournamentSetup: '#/tournament-setup',
        territory: '#/territory',
        pong4Player: '#/pong4'
    };

    static showPage(page) {
        window.location.hash = page;
    }

    static toggleForms() {
        if (router.currentPage === this.pages.login) {
            this.showPage(this.pages.register);
        } else {
            this.showPage(this.pages.login);
        }
    }

    static showLoginForm() {
        // Clear temporary storage first
        sessionStorage.removeItem('tempUserEmail');
        sessionStorage.removeItem('tempUsername');
        sessionStorage.removeItem('tempPassword');

        // Show login page
        this.showPage(this.pages.login);

        // Clear OTP timer
        if (AuthManager.currentOTPTimer) {
            clearInterval(AuthManager.currentOTPTimer);
            AuthManager.currentOTPTimer = null;
        }
    }

    static showToast(message, type = 'info') {
        const toastContainer = document.createElement('div');
        toastContainer.className = `toast align-items-center text-white bg-${type} border-0`;
        toastContainer.setAttribute('role', 'alert');
        toastContainer.innerHTML = `
            <div class="d-flex">
                <div class="toast-body">${message}</div>
                <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
            </div>
        `;
        
        const container = document.querySelector('.toast-container');
        if (container) {
            container.appendChild(toastContainer);
        const bsToast = new bootstrap.Toast(toastContainer, { delay: 3000 });
        bsToast.show();
        
        // Remove toast after it's hidden
        toastContainer.addEventListener('hidden.bs.toast', () => {
            toastContainer.remove();
        });
        }
    }

    static async loadMainPage() {
        try {
            // Get user profile
            const profile = await ProfileManager.fetchUserProfile();
            if (profile) {
                AuthManager.currentUser = profile;

                // Update UI elements after ensuring they exist
                await this.waitForElement('#username-display');
                this.updateProfileDisplay(profile);

                // Load user stats after ensuring elements exist
                await this.waitForElement('#stats-username');
                this.loadUserStats(profile);

                // Load users list FIRST
                await UserManager.loadUsersList();

                // Load friends list AFTER users list
                await FriendManager.updateFriendListUI();

                // THEN initialize chat status socket
                ChatManager.initStatusWebSocket();

                // Load match history after ensuring element exists
                await this.waitForElement('#match-history');
                const matches = await AuthManager.fetchMatchHistory();
                MatchManager.displayMatchHistory(matches);

                // After loading all components
                this.applyUsernameClickability();
            }
        } catch (error) {
            console.error('Error loading main page:', error);
            this.showToast('Failed to load user data', 'danger');
        }
    }

    static async waitForElement(selector, timeout = 5000) {
        return new Promise((resolve, reject) => {
            if (document.querySelector(selector)) {
                return resolve(document.querySelector(selector));
            }

            const observer = new MutationObserver(() => {
                if (document.querySelector(selector)) {
                    resolve(document.querySelector(selector));
                    observer.disconnect();
                }
            });

            observer.observe(document.body, {
                childList: true,
                subtree: true
            });

            setTimeout(() => {
                observer.disconnect();
                reject(new Error(`Timeout waiting for element: ${selector}`));
            }, timeout);
        });
    }

    static updateProfileDisplay(profile) {
        const usernameDisplay = document.getElementById('username-display');
        const profileAvatar = document.getElementById('profile-avatar');
        
        if (usernameDisplay) {
            usernameDisplay.textContent = profile.username;
        }
        
        if (profileAvatar && profile.avatar) {
            profileAvatar.src = profile.avatar;
            profileAvatar.onerror = () => {
                profileAvatar.src = '/media/avatars/default.svg';
            };
        }
    }

    static loadUserStats(profile) {
        const elements = {
            username: document.getElementById('stats-username'),
            matchWins: document.getElementById('stats-match-wins'),
            totalMatches: document.getElementById('stats-total-matches'),
            totalTourneys: document.getElementById('stats-total-tourneys')
        };

        if (elements.username) elements.username.textContent = profile.username;
        if (elements.matchWins) elements.matchWins.textContent = profile.match_wins || 0;
        if (elements.totalMatches) elements.totalMatches.textContent = profile.total_matches || 0;
        if (elements.totalTourneys) elements.totalTourneys.textContent = profile.total_tourneys || 0;
    }

    static async loadUpdateProfilePage() {
        try {
            const profile = await ProfileManager.fetchUserProfile();
            if (profile) {
                // Set the email value and placeholder
                const emailInput = document.getElementById('update-email');
                if (emailInput) {
                    emailInput.value = profile.email || '';
                    emailInput.placeholder = 'Enter your email';
                }
                
                // Clear password field
                document.getElementById('update-password').value = '';

                // Set current avatar
                const currentAvatar = document.getElementById('current-avatar');
                if (currentAvatar) {
                    currentAvatar.src = profile.avatar || '/media/avatars/default.svg';
                    currentAvatar.onerror = () => {
                        currentAvatar.src = '/media/avatars/default.svg';
                    };
                }

                // Update 2FA status display immediately
                const twoFAStatus = document.getElementById('2fa-status');
                if (twoFAStatus) {
                    twoFAStatus.innerHTML = `
                        <div class="alert ${profile.is_2fa_enabled ? 'alert-success' : 'alert-danger'} text-center">
                            2FA ${profile.is_2fa_enabled ? 'Enabled' : 'Disabled'}
                        </div>
                    `;
                }

                // Update 2FA section based on authentication type
                const twoFASection = document.getElementById('2fa-section');
                const twoFAStatusElement = document.getElementById('2fa-status');
                const twoFAForm = document.getElementById('2fa-toggle-form');

                if (profile.is_42_auth) {
                    // For 42 authenticated users - simpler message
                    twoFAStatus.innerHTML = `
                        <div class="alert alert-info text-center">
                            <i class="bi bi-info-circle me-2"></i>
                            Your 2FA settings are managed by your 42 School account
                        </div>
                    `;
                    if (twoFAForm) {
                        twoFAForm.style.display = 'none';
                    }
                } else {
                    // For regular users
                    twoFAStatus.innerHTML = `
                        <div class="alert ${profile.is_2fa_enabled ? 'alert-success' : 'alert-danger'} text-center">
                            2FA is currently ${profile.is_2fa_enabled ? 'Enabled' : 'Disabled'}
                        </div>
                    `;
                    if (twoFAForm) {
                        twoFAForm.style.display = 'block';
                    }
                }
            }
        } catch (error) {
            console.error('Error loading profile page:', error);
            UIManager.showToast('Failed to load profile data', 'danger');
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

                    <!-- Rest of the modal content remains the same -->
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
                            ${matches.length ? matches.slice(0, 5).map(match => {
                                const date = new Date(match.end_time || match.start_time);
                                const formattedDate = date.toLocaleDateString('en-US', {
                                    month: 'short',
                                    day: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit',
                                    hour12: false
                                });

                                if (match.match_type === 'Tournament' || match.match_type === 'Territory' || match.match_type === '4-Player Pong') {
                                    return `
                                        <div class="mb-3 p-3 bg-dark rounded match-history-item" style="background-color: #2b3035 !important; border: 1px solid rgba(255, 255, 255, 0.1);">
                                            <div class="d-flex flex-column">
                                                <div class="text-center mb-2">
                                                    <div class="match-type fw-bold text-white">
                                                        ${match.match_type} Match
                                                    </div>
                                                </div>
                                                <div class="d-flex justify-content-between align-items-center">
                                                    <small class="text-light-50" style="color: #adb5bd !important;">
                                                        ${formattedDate}
                                                    </small>
                                                    <small class="text-success">
                                                        Winner: ${match.winner_name}
                                                    </small>
                                                </div>
                                            </div>
                                        </div>
                                    `;
                                } else {
                                    const winner = match.winner_name;
                                    const isPlayer1Winner = match.player1_name === winner;
                                    const player1Class = isPlayer1Winner ? 'text-success' : 'text-danger';
                                    const player2Class = match.player2_name === winner ? 'text-success' : 'text-danger';
                                    const winnerClass = isPlayer1Winner ? 'text-success' : 'text-danger';

                                    return `
                                        <div class="mb-3 p-3 bg-dark rounded match-history-item" style="background-color: #2b3035 !important; border: 1px solid rgba(255, 255, 255, 0.1);">
                                            <div class="d-flex flex-column">
                                                <div class="text-center mb-2">
                                                    <div class="match-players mb-1">
                                                        <span class="fw-bold ${player1Class}">
                                                            ${match.player1_name}
                                                        </span>
                                                        <span class="mx-2 text-light">vs</span>
                                                        <span class="fw-bold ${player2Class}">
                                                            ${match.player2_name}
                                                        </span>
                                                    </div>
                                                    <div class="match-score">
                                                        Score: <span class="fw-bold">${match.player1_score} - ${match.player2_score}</span>
                                                    </div>
                                                </div>
                                                <div class="d-flex justify-content-between align-items-center">
                                                    <small class="text-light-50" style="color: #adb5bd !important;">
                                                        ${formattedDate}
                                                    </small>
                                                    <small class="${winnerClass}">
                                                        Winner: ${winner}
                                                    </small>
                                                </div>
                                            </div>
                                        </div>
                                    `;
                                }
                            }).join('') : '<p class="text-muted">No recent matches</p>'}
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

    static makeUsernameClickable(element, userId, username) {
        if (!element || !userId) return;
        
        element.style.cursor = 'pointer';
        element.style.textDecoration = 'underline';
        element.classList.add('clickable-username');
        
        // Create a new element with the same properties
        const newElement = element.cloneNode(true);
        
        // Replace the old element with the new one
        element.parentNode.replaceChild(newElement, element);
        
        // Add click handler to the new element
        newElement.addEventListener('click', async (e) => {
            e.preventDefault();
            e.stopPropagation();

            // Get the friends list modal element
            const friendsListModal = document.getElementById('friendsListModal');
            
            // Increase the z-index of the user profile modal
            const userProfileModal = document.getElementById('userProfileModal');
            if (userProfileModal) {
                // Set a higher z-index than the friends list modal
                userProfileModal.style.zIndex = '1060';
            }

            // Close any existing profile modal before showing the new one
            const existingModal = bootstrap.Modal.getInstance(document.getElementById('userProfileModal'));
            if (existingModal) {
                existingModal.hide();
                await new Promise(resolve => setTimeout(resolve, 150)); // Wait for modal to close
            }

            this.showUserProfile(userId);

            // Reset z-index when the profile modal is hidden
            userProfileModal.addEventListener('hidden.bs.modal', () => {
                userProfileModal.style.zIndex = '';
            }, { once: true });
        });
    }

    static applyUsernameClickability() {
        // Apply to match history
        document.querySelectorAll('.match-history-item').forEach(item => {
            const player1El = item.querySelector('.player1-name');
            const player2El = item.querySelector('.player2-name');
            if (player1El && player1El.dataset.userId) {
                this.makeUsernameClickable(player1El, player1El.dataset.userId);
            }
            if (player2El && player2El.dataset.userId) {
                this.makeUsernameClickable(player2El, player2El.dataset.userId);
            }
        });

        // Apply to friends list
        document.querySelectorAll('#friend-list-body .friend-username').forEach(el => {
            const userId = el.closest('tr').dataset.userId;
            if (userId) {
                this.makeUsernameClickable(el, userId);
            }
        });

        // Apply to users list
        document.querySelectorAll('#users-table-body .user-username').forEach(el => {
            const userId = el.closest('tr').dataset.userId;
            if (userId) {
                this.makeUsernameClickable(el, userId);
            }
        });

        // Apply to tournament brackets
        document.querySelectorAll('.tournament-player-name').forEach(el => {
            if (el.dataset.userId) {
                this.makeUsernameClickable(el, el.dataset.userId);
            }
        });
    }
}