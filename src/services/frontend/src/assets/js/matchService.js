// API service for match-related operations
class MatchService {
  constructor(baseUrl, authToken) {
    this.baseUrl = baseUrl;
    this.authToken = authToken;
  }

  async getMatches() {
    try {
      const response = await fetch(`${this.baseUrl}/matches/`, {
        headers: {
          'Authorization': `Bearer ${this.authToken}`
        }
      });
      
      if (!response.ok) {
        throw new MatchServiceError('Failed to fetch matches', response.status);
      }
      
      return response.json();
    } catch (error) {
      if (error instanceof MatchServiceError) throw error;
      throw new MatchServiceError('Network error', 500);
    }
  }

  async getMatchDetails(matchId) {
    const response = await fetch(`${this.baseUrl}/matches/${matchId}/`, {
      headers: {
        'Authorization': `Bearer ${this.authToken}` 
      }
    });
    return response.json();
  }

  async createMatch(matchData) {
    const response = await fetch(`${this.baseUrl}/matches/`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.authToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(matchData)
    });
    return response.json();
  }

  async updateMatch(matchId, matchData) {
    const response = await fetch(`${this.baseUrl}/matches/${matchId}/`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${this.authToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(matchData)
    });
    return response.json();
  }

  async updateMatchScore(matchId, player1Score, player2Score) {
    const response = await fetch(`${this.baseUrl}/matches/${matchId}/`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${this.authToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        player1_score: player1Score,
        player2_score: player2Score
      })
    });
    return response.json();
  }

  async endMatch(matchId, winnerId) {
    const response = await fetch(`${this.baseUrl}/matches/${matchId}/`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${this.authToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        winner: winnerId,
        end_time: new Date().toISOString()
      })
    });
    return response.json();
  }

  async deleteMatch(matchId) {
    const response = await fetch(`${this.baseUrl}/matches/${matchId}/`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${this.authToken}`
      }
    });
    return response.ok;
  }
}

// Move saveMatchResult to matchService.js
async function saveMatchResult(matchData) {
    try {
        let currentToken = localStorage.getItem('accessToken');
        if (!currentToken) {
            throw new Error('No access token available');
        }

        let response = await fetch(`${AuthManager.API_BASE}users/profile/`, {
            headers: {
                'Authorization': `Bearer ${currentToken}`,
                'Content-Type': 'application/json'
            }
        });

        // ... token refresh code ...

        const matchResponse = await fetch(`${AuthManager.API_BASE}matches/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${currentToken}`
            },
            body: JSON.stringify(matchData)
        });

        if (!matchResponse.ok) {
            const errorData = await matchResponse.json();
            console.error('Match save error details:', errorData);
            throw new Error('Failed to save match result');
        }

        const userResponse = await fetch(`${AuthManager.API_BASE}users/profile/`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${currentToken}`,
                'Content-Type': 'application/json'
            }
        });

        if (userResponse.ok) {
            const userData = await userResponse.json();
            const updateData = {
                username: userData.username,
                email: userData.email,
                total_matches: userData.total_matches + 1  // Always increment total_matches
            };

            await fetch(`${AuthManager.API_BASE}users/profile/`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${currentToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(updateData)
            });
        }

        return matchResponse.json();
    } catch (error) {
        console.error('Error saving match:', error);
        throw error;
    }
}

// Make both MatchService and saveMatchResult available globally
window.MatchService = MatchService;
window.saveMatchResult = saveMatchResult;