document.addEventListener('DOMContentLoaded', () => {
    // Navigation elements
    const playButton = document.getElementById('playButton');
    const tournamentButton = document.getElementById('tournamentButton');
    const profileButton = document.getElementById('profileButton');
    const leaderboardButton = document.getElementById('leaderboardButton');

    // Sections
    const gameSection = document.getElementById('gameSection');
    const tournamentSection = document.getElementById('tournamentSection');
    const profileSection = document.getElementById('profileSection');
    const leaderboardSection = document.getElementById('leaderboardSection');

    // Navigation functions
    function hideAllSections() {
        const sections = document.querySelectorAll('.section');
        sections.forEach(section => section.classList.add('hidden'));
    }

    function showSection(section) {
        hideAllSections();
        section.classList.remove('hidden');
    }

    // Event listeners for navigation
    playButton.addEventListener('click', () => showSection(gameSection));
    tournamentButton.addEventListener('click', () => showSection(tournamentSection));
    profileButton.addEventListener('click', () => showSection(profileSection));
    leaderboardButton.addEventListener('click', () => showSection(leaderboardSection));

    // Show game section by default
    showSection(gameSection);

    // Backend communication
    const API_URL = 'https://localhost:8000/api';

    async function fetchData(endpoint) {
        try {
            const response = await fetch(`${API_URL}/${endpoint}`);
            return await response.json();
        } catch (error) {
            console.error('Error fetching data:', error);
        }
    }

    // Load tournament data
    async function loadTournaments() {
        const tournaments = await fetchData('tournaments');
        const tournamentList = document.getElementById('tournamentList');
        // Implement tournament list rendering
    }

    // Load profile data
    async function loadProfile() {
        const profile = await fetchData('profile');
        const userStats = document.getElementById('userStats');
        const matchHistory = document.getElementById('matchHistory');
        // Implement profile data rendering
    }

    // Load leaderboard data
    async function loadLeaderboard() {
        const leaderboard = await fetchData('leaderboard');
        const leaderboardList = document.getElementById('leaderboardList');
        // Implement leaderboard rendering
    }
});