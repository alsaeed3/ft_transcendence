class UserServiceError extends Error {
	constructor(message, status) {
	  super(message);
	  this.status = status;
	}
  }
  
  class UserService {
	constructor(baseUrl, authToken) {
	  this.baseUrl = baseUrl;
	  this.authToken = authToken;
	}
  
	async getUserProfile(userId) {
	  try {
		const response = await fetch(`${this.baseUrl}/users/${userId}/`, {
		  headers: {
			'Authorization': `Bearer ${this.authToken}`
		  }
		});
		
		if (!response.ok) {
		  throw new UserServiceError('Failed to fetch user profile', response.status);
		}
		
		return response.json();
	  } catch (error) {
		if (error instanceof UserServiceError) throw error;
		throw new UserServiceError('Network error', 500);
	  }
	}
  
	async updateUserProfile(userId, userData) {
	  try {
		const response = await fetch(`${this.baseUrl}/users/${userId}/`, {
		  method: 'PATCH',
		  headers: {
			'Authorization': `Bearer ${this.authToken}`,
			'Content-Type': 'application/json'
		  },
		  body: JSON.stringify(userData)
		});
		
		if (!response.ok) {
		  throw new UserServiceError('Failed to update profile', response.status);
		}
		
		return response.json();
	  } catch (error) {
		if (error instanceof UserServiceError) throw error;
		throw new UserServiceError('Network error', 500);
	  }
	}
  
	async getUserMatches(userId) {
	  try {
		const response = await fetch(`${this.baseUrl}/users/${userId}/matches/`, {
		  headers: {
			'Authorization': `Bearer ${this.authToken}`
		  }
		});
		
		if (!response.ok) {
		  throw new UserServiceError('Failed to fetch user matches', response.status);
		}
		
		return response.json();
	  } catch (error) {
		if (error instanceof UserServiceError) throw error;
		throw new UserServiceError('Network error', 500);
	  }
	}
  
	async getUserStats(userId) {
	  try {
		const response = await fetch(`${this.baseUrl}/users/${userId}/stats/`, {
		  headers: {
			'Authorization': `Bearer ${this.authToken}`
		  }
		});
		
		if (!response.ok) {
		  throw new UserServiceError('Failed to fetch user stats', response.status);
		}
		
		return response.json();
	  } catch (error) {
		if (error instanceof UserServiceError) throw error;
		throw new UserServiceError('Network error', 500);
	  }
	}
  
	async login(credentials) {
	  try {
		const response = await fetch(`${this.baseUrl}/auth/login/`, {
		  method: 'POST',
		  headers: {
			'Content-Type': 'application/json'
		  },
		  body: JSON.stringify(credentials)
		});
		
		if (!response.ok) {
		  throw new UserServiceError('Login failed', response.status);
		}
		
		return response.json();
	  } catch (error) {
		if (error instanceof UserServiceError) throw error;
		throw new UserServiceError('Network error', 500);
	  }
	}
  
	async register(userData) {
	  try {
		const response = await fetch(`${this.baseUrl}/auth/register/`, {
		  method: 'POST',
		  headers: {
			'Content-Type': 'application/json'
		  },
		  body: JSON.stringify(userData)
		});
		
		if (!response.ok) {
		  throw new UserServiceError('Registration failed', response.status);
		}
		
		return response.json();
	  } catch (error) {
		if (error instanceof UserServiceError) throw error;
		throw new UserServiceError('Network error', 500);
	  }
	}
  }
  
  export default UserService;