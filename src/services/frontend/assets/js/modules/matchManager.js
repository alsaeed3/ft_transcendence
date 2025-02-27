import { AuthManager } from './authManager.js';
import { UIManager } from './uiManager.js';
import { LanguageManager } from './LanguageManager.js';

export class MatchManager {
	static async fetchMatchHistory() {
        try {
            if (!AuthManager.currentUser?.id) {
                console.log('No current user ID available');
                return [];
            }
            
            const url = `${AuthManager.API_BASE}matches/history/${AuthManager.currentUser.id}/`;
            const response = await AuthManager.fetchWithAuth(url);
            
            if (!response.ok) {
                if (response.status === 404) {
                    return [];
                }
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const matches = await response.json();
            return matches.sort((a, b) => {
                const dateA = new Date(a.end_time || a.start_time);
                const dateB = new Date(b.end_time || b.start_time);
                return dateB - dateA;
            });
        } catch (error) {
            console.error('Error fetching matches:', error);
            return [];
        }
    }

    static displayMatchHistory(matches) {
        const matchHistoryContainer = document.getElementById('match-history');
        if (!matchHistoryContainer) return;

        const matchesHtml = matches.slice(0, AuthManager.RECENT_MATCHES_LIMIT).map(match => {
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
                                    ${match.match_type} <span data-i18n="match">Match</span>
                                </div>
                            </div>
                            <div class="d-flex justify-content-between align-items-center">
                                <small class="text-light-50" style="color: #adb5bd !important;">
                                    ${formattedDate}
                                </small>
                                <small class="text-success">
                                    <span data-i18n="winner">Winner</span>: ${match.winner_name}
                                </small>
                            </div>
                        </div>
                    </div>
                `;
            } else {
                const winner = match.winner_name;
                const isPlayer1Winner = match.player1_name === winner;
                const player1Class = isPlayer1Winner ? 'text-success' : '';
                const player2Class = match.player2_name === winner ? 'text-danger' : '';
                const winnerClass = isPlayer1Winner ? 'text-success' : 'text-danger';

                return `
                    <div class="mb-3 p-3 bg-dark rounded match-history-item" style="background-color: #2b3035 !important; border: 1px solid rgba(255, 255, 255, 0.1);">
                        <div class="d-flex flex-column">
                            <div class="text-center mb-2">
                                <div class="match-players mb-1">
                                    <span class="fw-bold ${player1Class}">
                                        ${match.player1_name}
                                    </span>
                                    <span class="mx-2 text-light" data-i18n="vs">vs</span>
                                    <span class="fw-bold ${player2Class}">
                                        ${match.player2_name}
                                    </span>
                                </div>
                                <div class="match-score">
                                    <span data-i18n="score">Score</span>: 
                                    <span class="fw-bold">${match.player1_score} - ${match.player2_score}</span>
                                </div>
                            </div>
                            <div class="d-flex justify-content-between align-items-center">
                                <small class="text-light-50" style="color: #adb5bd !important;">
                                    ${formattedDate}
                                </small>
                                <small class="${winnerClass}">
                                    <span data-i18n="winner">Winner</span>: ${winner}
                                </small>
                            </div>
                        </div>
                    </div>
                `;
            }
        }).join('');

        matchHistoryContainer.innerHTML = matchesHtml;

        // Update translations for the newly added content
        LanguageManager.updateContent();
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
            const canvas = document.getElementById('pongCanvas');
            if (canvas) {
                // Wait for next frame to ensure canvas is ready
                requestAnimationFrame(() => {
                    if (typeof initGame === 'function') {
                        initGame(mode);
                UIManager.showToast(`${mode.toUpperCase()} match started!`, 'success');
                    } else {
                        console.error('initGame function not found');
                        UIManager.showToast('Failed to start game: Game initialization error', 'danger');
                    }
                });
            } else {
                console.error('Canvas element not found');
                UIManager.showToast('Failed to start game: Canvas not found', 'danger');
            }
        } catch (error) {
            console.error('Error initializing game:', error);
            UIManager.showToast('Failed to start game', 'danger');
        }
    }
    // TODO: Add getting tournament data using the updated matches API
    static async createTournament() {
        try {
            // const response = await AuthManager.fetchWithAuth(`${AuthManager.API_BASE}tournaments/create/`, {
            //     method: 'POST',
            //     headers: {
            //         'Content-Type': 'application/json'
            //     }
            // });

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