function initTerritory() {
    const GRID_SIZE = 20;
    const CELL_SIZE = 25;
    const PLAYER_SPEED = 5;
    let gameActive = true;
    let animationFrameId = null;

    // Player data
    const players = [
        { id: 1, color: '#FF0000', x: 0, y: 0, keys: { up: 'w', down: 's', left: 'a', right: 'd' } },
        { id: 2, color: '#4444FF', x: GRID_SIZE - 1, y: 0, keys: { up: 'i', down: 'k', left: 'j', right: 'l' } },
        { id: 3, color: '#00FF00', x: GRID_SIZE/2, y: GRID_SIZE - 1, keys: { up: 'arrowup', down: 'arrowdown', left: 'arrowleft', right: 'arrowright' } }
    ];

    // Create game container
    const gameContainer = document.createElement('div');
    gameContainer.className = 'territory-game';

    // Create canvas
    const canvas = document.createElement('canvas');
    canvas.width = GRID_SIZE * CELL_SIZE;
    canvas.height = GRID_SIZE * CELL_SIZE;
    const ctx = canvas.getContext('2d');
    gameContainer.appendChild(canvas);

    // Create score display
    const scoreDisplay = document.createElement('div');
    scoreDisplay.className = 'score-display';
    scoreDisplay.innerHTML = `
        <div class="player-score" style="color: #FF0000">Red: 0</div>
        <div class="player-score" style="color: #4444FF">Blue: 0</div>
        <div class="player-score" style="color: #00FF00">Green: 0</div>
    `;
    gameContainer.appendChild(scoreDisplay);

    // Create instructions
    const instructions = document.createElement('div');
    instructions.className = 'instructions';
    instructions.innerHTML = `
        <h3>Controls:</h3>
        <p>Red Player: WASD</p>
        <p>Blue Player: IJKL</p>
        <p>Green Player: Arrow Keys</p>
        <p>Capture territory by moving around!</p>
    `;
    gameContainer.appendChild(instructions);

    document.getElementById('game-container').appendChild(gameContainer);

    // Initialize grid
    let grid = Array(GRID_SIZE).fill().map(() => Array(GRID_SIZE).fill(null));

    // Track pressed keys
    const keysPressed = new Set();

    // Create separate functions for event listeners so we can remove them
    function handleKeyDown(e) {
        keysPressed.add(e.key.toLowerCase());
    }

    function handleKeyUp(e) {
        keysPressed.delete(e.key.toLowerCase());
    }

    // Add event listeners
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);

    function updateGame() {
        if (!gameActive) return;

        // Update player positions based on keys
        players.forEach(player => {
            let newX = player.x;
            let newY = player.y;

            if (keysPressed.has(player.keys.up)) newY = Math.max(0, player.y - PLAYER_SPEED/CELL_SIZE);
            if (keysPressed.has(player.keys.down)) newY = Math.min(GRID_SIZE - 1, player.y + PLAYER_SPEED/CELL_SIZE);
            if (keysPressed.has(player.keys.left)) newX = Math.max(0, player.x - PLAYER_SPEED/CELL_SIZE);
            if (keysPressed.has(player.keys.right)) newX = Math.min(GRID_SIZE - 1, player.x + PLAYER_SPEED/CELL_SIZE);

            // Capture territory
            const gridX = Math.floor(player.x);
            const gridY = Math.floor(player.y);
            if (grid[gridY][gridX] !== player.id) {
                grid[gridY][gridX] = player.id;
            }

            player.x = newX;
            player.y = newY;
        });

        // Update scores and check for winner
        const scores = [0, 0, 0];
        grid.forEach(row => {
            row.forEach(cell => {
                if (cell !== null) {
                    scores[cell - 1]++;
                }
            });
        });

        // Update score display
        const scoreElements = document.querySelectorAll('.player-score');
        scoreElements[0].textContent = `Red: ${scores[0]}`;
        scoreElements[1].textContent = `Blue: ${scores[1]}`;
        scoreElements[2].textContent = `Green: ${scores[2]}`;

        // Check for winner (when one player has more than 30% of total cells)
        const totalCells = GRID_SIZE * GRID_SIZE;
        const winningScore = totalCells * 0.3;
        scores.forEach((score, index) => {
            if (score > winningScore) {
                gameActive = false;
                announceWinner(index + 1);
            }
        });

        // Draw game state
        drawGame();

        // Store the animation frame ID
        animationFrameId = requestAnimationFrame(updateGame);
    }

    function drawGame() {
        // Clear canvas
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Draw grid
        grid.forEach((row, y) => {
            row.forEach((cell, x) => {
                if (cell !== null) {
                    ctx.fillStyle = players[cell - 1].color;
                    ctx.fillRect(x * CELL_SIZE, y * CELL_SIZE, CELL_SIZE, CELL_SIZE);
                }
            });
        });

        // Draw players with colored centers and white borders
        players.forEach(player => {
            // Draw white outer circle (border)
            ctx.fillStyle = '#FFFFFF';
            ctx.beginPath();
            ctx.arc(
                player.x * CELL_SIZE + CELL_SIZE/2,
                player.y * CELL_SIZE + CELL_SIZE/2,
                CELL_SIZE/2,
                0,
                Math.PI * 2
            );
            ctx.fill();

            // Draw colored inner circle
            ctx.fillStyle = player.color;
            ctx.beginPath();
            ctx.arc(
                player.x * CELL_SIZE + CELL_SIZE/2,
                player.y * CELL_SIZE + CELL_SIZE/2,
                CELL_SIZE/2 - 3,  // Slightly smaller to show white border
                0,
                Math.PI * 2
            );
            ctx.fill();
        });
    }

    function announceWinner(playerId) {
        const colors = ['Red', 'Light Blue', 'Green'];
        const announcement = document.createElement('div');
        announcement.className = 'winner-announcement';
        announcement.style.color = players[playerId - 1].color;
        announcement.textContent = `${colors[playerId - 1]} Player Wins!`;
        gameContainer.appendChild(announcement);

        // Update explanation text
        const explanation = document.createElement('div');
        explanation.className = 'winner-explanation';
        explanation.textContent = `(First to capture 30% of the board)`;
        announcement.appendChild(explanation);

        // Automatically redirect after 3 seconds
        setTimeout(() => {
            document.getElementById('back-to-menu').click();
        }, 3000);
    }

    function resetGame() {
        grid = Array(GRID_SIZE).fill().map(() => Array(GRID_SIZE).fill(null));
        players[0].x = 0;
        players[0].y = 0;
        players[1].x = GRID_SIZE - 1;
        players[1].y = 0;
        players[2].x = GRID_SIZE/2;
        players[2].y = GRID_SIZE - 1;
        gameActive = true;
        const announcement = document.querySelector('.winner-announcement');
        if (announcement) announcement.remove();
    }

    function stop() {
        gameActive = false;
        if (animationFrameId) {
            cancelAnimationFrame(animationFrameId);
        }
    }

    // Start game
    updateGame();

    // Return game controller
    return {
        stop,
        handleKeyDown,
        handleKeyUp
    };
}