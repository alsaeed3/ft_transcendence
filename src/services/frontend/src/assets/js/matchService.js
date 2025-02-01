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

export default MatchService;