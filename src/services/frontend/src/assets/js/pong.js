function initGame(mode = 'AI') {
    const canvas = document.getElementById('pongCanvas');
    if (!canvas) return; // Exit if canvas isn't loaded yet
    
    const ctx = canvas.getContext('2d', { alpha: false }); // Optimize for non-transparent canvas

    // Score elements
    const playerScoreElement = document.getElementById('rightPlayerScore');
    const computerScoreElement = document.getElementById('leftPlayerScore');
    let playerScore = 0;
    let computerScore = 0;

    // Game settings as variables
    let paddleWidth = 15;      // Slightly thinner paddle for better challenge
    let paddleHeight = 100;    // Shorter paddle for better challenge
    let ballRadius = 8;        // Slightly smaller ball
    let PADDLE_SPEED = 8;      // Faster paddle movement for better control
    let BALL_SPEED = 6;        // Slightly faster ball for more excitement

    // Initialize slider values and ranges
    const initializeSliders = () => {
        // Paddle Width slider
        const paddleWidthSlider = document.getElementById('paddleWidth');
        paddleWidthSlider.min = paddleWidth;
        paddleWidthSlider.max = 50;
        paddleWidthSlider.value = paddleWidth;
        
        // Paddle Height slider
        const paddleHeightSlider = document.getElementById('paddleHeight');
        paddleHeightSlider.min = paddleHeight;
        paddleHeightSlider.max = 200;
        paddleHeightSlider.value = paddleHeight;
        
        // Paddle Speed slider
        const paddleSpeedSlider = document.getElementById('paddleSpeed');
        paddleSpeedSlider.min = PADDLE_SPEED;
        paddleSpeedSlider.max = 10;
        paddleSpeedSlider.value = PADDLE_SPEED;
        
        // Ball Speed slider - disabled for authentic 1972 experience
        /*
        const ballSpeedSlider = document.getElementById('ballSpeed');
        ballSpeedSlider.min = BALL_SPEED;
        ballSpeedSlider.max = 10;
        ballSpeedSlider.value = BALL_SPEED;
        */

        // Update all display values
        document.getElementById('paddleWidthValue').textContent = paddleWidth;
        document.getElementById('paddleHeightValue').textContent = paddleHeight;
        document.getElementById('paddleSpeedValue').textContent = PADDLE_SPEED;
        // document.getElementById('ballSpeedValue').textContent = BALL_SPEED;
    };

    // Call initialization right after setting game settings
    initializeSliders();

    // Game state
    let paddle1Y = canvas.height / 2 - paddleHeight / 2;
    let paddle2Y = canvas.height / 2 - paddleHeight / 2;
    let ballX = canvas.width / 2;
    // Set initial serve position
    const startFromTop = Math.random() < 0.5;
    let ballY = startFromTop ? 
        canvas.height * 0.25 :  // Top quarter
        canvas.height * 0.75;   // Bottom quarter
    let ballSpeedX = 0;  // No initial movement
    let ballSpeedY = 0;

    // AI properties
    let lastAIUpdate = Date.now();
    let lastAIPaddleMove = Date.now();  // Track last paddle movement
    const AI_UPDATE_INTERVAL = 1000;    // Decision making interval
    const AI_MOVE_INTERVAL = 20;       // Paddle movement interval
    const AI_DIFFICULTY = 0.85;         // Rule: Consistent challenge (0 = always miss, 1 = perfect)

    let aiMoveUp = false;              // Rule: Simulated keyboard
    let aiMoveDown = false;
    let targetY = canvas.height / 2;
    let prevBallSpeedX = ballSpeedX;   // Track ball direction changes
    let calculationMade = false;       // Ensure one calculation per approach

    const WINNING_SCORE = 2;
    let gameActive = true;
    const gameOverMessage = document.getElementById('gameOverMessage');

    // Add username variables
    let username = '';
    let player2Name = mode === 'PVP' ? sessionStorage.getItem('player2Name') : 'Computer';

    // Remove the token check and replace with a proper auth check
    async function checkAuth() {
        try {
            const response = await fetch(`${AuthManager.API_BASE}users/me/`, {
                credentials: 'include'
            });
            
            if (!response.ok) {
                window.location.href = '/';
                return false;
            }
            return true;
        } catch (error) {
            window.location.href = '/';
            return false;
        }
    }

    // Update the fetchUsername function
    async function fetchUsername() {
        try {
            const response = await fetch(`${AuthManager.API_BASE}users/profile/`, {
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            if (response.ok) {
                const userData = await response.json();
                username = userData.username;
                document.getElementById('rightPlayerName').textContent = username;
            } else {
                window.location.href = '/';
            }
        } catch (error) {
            console.error('Error fetching username:', error);
            window.location.href = '/';
        }
    }

    // Initialize the game
    async function initialize() {
        const isAuthenticated = await checkAuth();
        if (!isAuthenticated) return;

        if (mode !== 'TOURNAMENT') {
            await fetchUsername();
        }

        // Start the game loop
        requestAnimationFrame(gameLoop);
    }

    // Call initialize instead of direct fetchUsername
    initialize();

    function updateAI() {
        const currentTime = Date.now();

        // Only recalculate target position every second
        if (currentTime - lastAIUpdate >= AI_UPDATE_INTERVAL) {
            if (ballSpeedX < 0) {  // Ball moving towards AI
                // Recalculate on direction change, new serve, or no existing calculation
                if (prevBallSpeedX >= 0 || Math.abs(ballX - canvas.width/2) < 10 || !calculationMade) {
                    // Calculate ball intersection with paddle plane
                let predictedY = ballY + (ballSpeedY * (ballX / -ballSpeedX));
                
                    // Bounce prediction
                while (predictedY < 0 || predictedY > canvas.height) {
                        predictedY = predictedY < 0 ? -predictedY : 2 * canvas.height - predictedY;
                    }
                    
                    // Add human error (undershoot) based on difficulty
                    if (Math.random() > AI_DIFFICULTY) {
                        console.log('AI Decision: MISS');
                        const paddleCenter = paddle1Y + paddleHeight/2;
                        
                        // Calculate miss distance based on paddle height
                        // Miss by moving just enough to make the ball miss the paddle
                        const missDistance = (paddleHeight/2) + ballRadius + 5; // Just enough to miss
                        
                        // If ball is above paddle, miss by staying too low
                        // If ball is below paddle, miss by staying too high
                        if (predictedY > paddleCenter) {
                            predictedY = predictedY - missDistance;  // Miss by not moving up enough
                    } else {
                            predictedY = predictedY + missDistance;  // Miss by not moving down enough
                        }
                    }
                    
                    targetY = predictedY;
                    calculationMade = true;
                }
            } else {
                targetY = canvas.height / 2;  // Return to center
                calculationMade = false;
            }
            
            prevBallSpeedX = ballSpeedX;
            lastAIUpdate = currentTime;
        }
        
        // Simulate keyboard input
        const paddleCenter = paddle1Y + paddleHeight/2;
        const distanceToTarget = targetY - paddleCenter;
        
        // Reset movement flags
        aiMoveUp = false;
        aiMoveDown = false;
        
        // Set movement flags based on target position
        if (Math.abs(distanceToTarget) > 10) {  // Deadzone to prevent jitter
            if (distanceToTarget < 0) {
                aiMoveUp = true;
            } else {
                aiMoveDown = true;
            }
        }
        
        // Move paddle with delay
        if (currentTime - lastAIPaddleMove >= AI_MOVE_INTERVAL) {
            if (aiMoveUp) {
                paddle1Y = Math.max(0, paddle1Y - PADDLE_SPEED);
                lastAIPaddleMove = currentTime;
            } else if (aiMoveDown) {
                paddle1Y = Math.min(canvas.height - paddleHeight, paddle1Y + PADDLE_SPEED);
                lastAIPaddleMove = currentTime;
            }
        }
    }

    function checkWinCondition() {
        if (playerScore >= WINNING_SCORE || computerScore >= WINNING_SCORE) {
            gameActive = false;
            
            if (mode === 'TOURNAMENT') {
                const currentPlayers = tournamentBracket[currentRound];
                const winner = playerScore > computerScore ? 
                    currentPlayers[currentMatchIndex] : 
                    currentPlayers[currentMatchIndex + 1];
                
                // Update bracket and show result
                tournamentBracket[currentRound][currentMatchIndex] = winner;
                tournamentBracket[currentRound][currentMatchIndex + 1] = null;
                
                handleMatchEnd(winner);
                
                const messageElement = gameOverMessage.querySelector('h2');
                messageElement.className = 'text-white text-center display-8 font-monospace';
                messageElement.textContent = `${winner} wins the match!`;
                gameOverMessage.classList.remove('d-none');
                
                setTimeout(() => {
                    gameOverMessage.classList.add('d-none');
                    startNextTournamentMatch();
                }, 2000);
            } else {
                // Regular PVP/AI win condition
                const winner = playerScore > computerScore ? 
                    `${username} WINS!` : 
                    (mode === 'PVP' ? `${player2Name} WINS!` : 'COMPUTER WINS!');
                const messageElement = gameOverMessage.querySelector('h2');
                messageElement.className = 'text-white text-center display-8 font-monospace';
                messageElement.textContent = winner;
                gameOverMessage.classList.remove('d-none');
                
                // Save match result
                const matchData = {
                    tournament: null,
                    player1_name: username,
                    player2_name: mode === 'PVP' ? player2Name : 'AI',
                    player1_score: playerScore,
                    player2_score: computerScore,
                    start_time: new Date().toISOString(),
                    end_time: new Date().toISOString(),
                    winner_name: playerScore > computerScore ? username : player2Name,
                    match_type: mode === 'PVP' ? 'PVP' : 'AI'  // Explicitly set match type
                };
                saveMatchResult(matchData);
                
                setTimeout(() => {
                    window.location.href = '/';
                }, 3000);
            }
        }
    }

    // Update saveMatchResult function
    async function saveMatchResult(matchData) {
        try {
            const response = await fetch(`${AuthManager.API_BASE}matches/`, {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(matchData)
            });

            if (!response.ok) {
                if (response.status === 401) {
                    window.location.href = '/';
                    return;
                }
                throw new Error('Failed to save match result');
            }

            // Store match data in sessionStorage
            const savedMatch = await response.json();
            if (mode === 'PVP') {
                sessionStorage.setItem(`match_${savedMatch.id}_player2`, player2Name);
                sessionStorage.setItem(`match_${savedMatch.id}_type`, 'PVP');
            }

            // Instead of redirecting, use UIManager to transition
            setTimeout(() => {
                // Use a custom event to handle the transition
                const event = new CustomEvent('gameComplete', { 
                    detail: { matchData: savedMatch } 
                });
                window.dispatchEvent(event);
            }, 3000);

        } catch (error) {
            console.error('Error saving match:', error);
            window.location.href = '/';
        }
    }

    function moveBall() {
        if (!gameActive) return;

        ballX += ballSpeedX;
        ballY += ballSpeedY;
        
        // Wall collisions
        if (ballY <= 0 || ballY >= canvas.height) {
            ballSpeedY = -ballSpeedY;
        }
        
        // Paddle collisions
        if (ballX <= paddleWidth) {
            if (ballY >= paddle1Y && ballY <= paddle1Y + paddleHeight) {
                // Increase speed on hit (1972-style)
                const speedIncrease = 1.1;  // 10% faster each hit
                BALL_SPEED = Math.min(BALL_SPEED * speedIncrease, 15);
                
                ballSpeedX = Math.abs(BALL_SPEED);
                ballSpeedY = ((ballY - (paddle1Y + paddleHeight/2)) / (paddleHeight/2)) * BALL_SPEED;
            } else if (ballX < 0) {
                playerScore++;
                playerScoreElement.textContent = playerScore;
                checkWinCondition();
                if (gameActive) resetBall();
            }
        }
        
        if (ballX >= canvas.width - paddleWidth) {
            if (ballY >= paddle2Y && ballY <= paddle2Y + paddleHeight) {
                // Add same speed increase for right paddle
                const speedIncrease = 1.1;
                BALL_SPEED = Math.min(BALL_SPEED * speedIncrease, 15);
                
                ballSpeedX = -Math.abs(BALL_SPEED);
                ballSpeedY = ((ballY - (paddle2Y + paddleHeight/2)) / (paddleHeight/2)) * BALL_SPEED;
            } else if (ballX > canvas.width) {
                computerScore++;
                computerScoreElement.textContent = computerScore;
                checkWinCondition();
                if (gameActive) resetBall();
            }
        }
    }

    function draw() {
        // Clear screen (black background)
        ctx.fillStyle = 'black';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Draw classic 1972 center line (dashed)
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 4;
        ctx.setLineDash([20, 15]); // Larger dashes for authentic look
        ctx.beginPath();
        ctx.moveTo(canvas.width / 2, 0);
        ctx.lineTo(canvas.width / 2, canvas.height);
        ctx.stroke();
        ctx.setLineDash([]); // Reset dash pattern
        
        // Draw paddles and ball
        ctx.fillStyle = 'white';
        ctx.fillRect(0, paddle1Y, paddleWidth, paddleHeight);
        ctx.fillRect(canvas.width - paddleWidth, paddle2Y, paddleWidth, paddleHeight);
        
        ctx.beginPath();
        ctx.arc(ballX, ballY, ballRadius, 0, Math.PI * 2);
        ctx.fill();
        ctx.closePath();
    }

    function resetBall() {
        BALL_SPEED = 6;  // Reset to initial speed
        
        // Keep using same starting position as initial serve
        ballX = canvas.width / 2;
        ballY = startFromTop ? 
            canvas.height * 0.25 :  // Top quarter
            canvas.height * 0.75;   // Bottom quarter
        
        // Random serve direction
        ballSpeedX = BALL_SPEED * (Math.random() < 0.5 ? 1 : -1);
        
        // Maintain diagonal serve direction based on starting position
        ballSpeedY = BALL_SPEED * (startFromTop ? 0.5 : -0.5);  // Down from top, up from bottom
        calculationMade = false;

        // Add 1-second serve delay
        gameActive = false;
        setTimeout(() => {
            gameActive = true;
        }, 1000);
    }

    // Make updateGameSettings available globally
    window.updateGameSettings = function(newWidth, newHeight, newPaddleSpeed) {
        // Update settings
        paddleWidth = newWidth;
        paddleHeight = newHeight;
        PADDLE_SPEED = newPaddleSpeed;
        
        // Update the display values
        document.getElementById('paddleWidthValue').textContent = newWidth;
        document.getElementById('paddleHeightValue').textContent = newHeight;
        document.getElementById('paddleSpeedValue').textContent = newPaddleSpeed;
    };

    // Keyboard controls
    document.addEventListener('keydown', (event) => {
        switch(event.key.toLowerCase()) {
            case 'p':  // Right player controls
                if (mode === 'PVP' || mode === 'TOURNAMENT' || mode === 'AI') {  // Added AI mode
                paddle2Y = Math.max(0, paddle2Y - PADDLE_SPEED);
                }
                break;
            case 'l':
                if (mode === 'PVP' || mode === 'TOURNAMENT' || mode === 'AI') {  // Added AI mode
                    paddle2Y = Math.min(canvas.height - paddleHeight, paddle2Y + PADDLE_SPEED);
                }
                break;
            case 'w':  // Left player controls (AI or second player)
                if (mode === 'PVP' || mode === 'TOURNAMENT') {  // Only in PVP/Tournament
                    paddle1Y = Math.max(0, paddle1Y - PADDLE_SPEED);
                }
                break;
            case 's':
                if (mode === 'PVP' || mode === 'TOURNAMENT') {  // Only in PVP/Tournament
                    paddle1Y = Math.min(canvas.height - paddleHeight, paddle1Y + PADDLE_SPEED);
                }
                break;
        }
    });

    let lastTime = 0;
    const targetFPS = 60;
    const frameInterval = 1000 / targetFPS;

    // At the top with other game variables
    let gameStarted = false;  // Add this to control initial game state

    // Modify game loop to prevent any ball movement before announcement
    function gameLoop(currentTime) {
        if (!lastTime) lastTime = currentTime;
        
        const deltaTime = currentTime - lastTime;
        
        if (deltaTime >= frameInterval) {
            draw();  // Always draw the game state
            
            if (gameActive && gameStarted) {  // Only move ball if game has started
                if (mode === 'AI') {
        updateAI();
                }
        moveBall();
            }
            
            lastTime = currentTime - (deltaTime % frameInterval);
        }
        
        requestAnimationFrame(gameLoop);
    }

    // Start the game loop
    requestAnimationFrame(gameLoop);

    // Add slider event listeners
    const sliders = [
        'paddleWidth', 
        'paddleHeight', 
        'paddleSpeed'
    ];
    sliders.forEach(sliderId => {
        const slider = document.getElementById(sliderId);
        if (slider) {
            slider.addEventListener('input', () => {
                const width = parseInt(document.getElementById('paddleWidth').value);
                const height = parseInt(document.getElementById('paddleHeight').value);
                const pSpeed = parseInt(document.getElementById('paddleSpeed').value);
                
                updateGameSettings(width, height, pSpeed);
            });
        }
    });

    // Update game info display
    function updateGameInfo() {
        document.getElementById('gameMode').textContent = mode === 'TOURNAMENT' ? 
            `Tournament Match ${matchNumber}` : 
            (mode === 'AI' ? 'Player vs AI' : 'Player vs Player');
        
        if (mode === 'TOURNAMENT') {
            // Update current players
            document.getElementById('rightPlayerName').textContent = tournamentBracket[currentRound][currentMatchIndex];
            document.getElementById('leftPlayerName').textContent = tournamentBracket[currentRound][currentMatchIndex + 1];
        } else {
            // Regular game display
            document.getElementById('rightPlayerName').textContent = username || 'Loading...';
            document.getElementById('leftPlayerName').textContent = mode === 'PVP' ? player2Name : 'Computer';
        }
    }

    // Add at the top with other game variables
    let tournamentPlayers = [];
    let currentMatchIndex = 0;
    let currentRound = 0;
    let tournamentBracket = [];
    let matchNumber = 1;  // Only used for display

    let bracketWinners = {
        '1-2': null,
        '3-4': null,
        '5-6': null,
        '7-8': null,
        'semi1': null
    };

    function handleMatchEnd(winner) {
        if (currentRound === 0) {
            if (currentMatchIndex === 0) bracketWinners['1-2'] = winner;
            else if (currentMatchIndex === 2) bracketWinners['3-4'] = winner;
            else if (currentMatchIndex === 4) bracketWinners['5-6'] = winner;
            else if (currentMatchIndex === 6) bracketWinners['7-8'] = winner;
        } else if (currentRound === 1) {
            if (currentMatchIndex === 0) bracketWinners['semi1'] = winner;
        }
    }

    function initTournament() {
        tournamentPlayers = JSON.parse(sessionStorage.getItem('tournamentPlayers') || '[]');
        tournamentBracket = [tournamentPlayers];
        currentMatchIndex = 0;
        currentRound = 0;
        matchNumber = 1;
        
        updateGameInfo();
        resetMatch();
        
        setTimeout(() => {
            announceMatch();
        }, 100);
        
        updateTournamentDisplay();
    }

    // Modify announceMatch to control game start
    function announceMatch() {
        gameActive = false;
        gameStarted = false;  // Ensure ball doesn't move
        
        const player1 = tournamentBracket[currentRound][currentMatchIndex];
        const player2 = tournamentBracket[currentRound][currentMatchIndex + 1];
        const messageElement = gameOverMessage.querySelector('h2');
        messageElement.className = 'text-white text-center display-8 font-monospace';
        messageElement.innerHTML = `${player1} vs ${player2}<br><span class="countdown">Match starting in 3</span>`;
        gameOverMessage.classList.remove('d-none');
        
        let count = 2;
        const countdownInterval = setInterval(() => {
            if (count > 0) {
                messageElement.innerHTML = `${player1} vs ${player2}<br><span class="countdown">Match starting in ${count}</span>`;
                count--;
            } else {
                clearInterval(countdownInterval);
                gameOverMessage.classList.add('d-none');
                updateGameInfo();
                resetMatch();
                gameStarted = true;  // Now allow ball movement
                gameActive = true;
            }
        }, 1000);
    }

    function startNextTournamentMatch() {
        currentMatchIndex += 2;
        
        if (currentMatchIndex >= tournamentBracket[currentRound].length) {
            const winners = tournamentBracket[currentRound].filter(player => player !== null);
            
            if (winners.length > 1) {
                currentRound++;
                currentMatchIndex = 0;
                tournamentBracket[currentRound] = winners;
                matchNumber++;
                announceMatch();  // Announce next match
            } else {
                endTournament(winners[0] || 'No winner');
            }
        } else {
            matchNumber++;
            announceMatch();  // Announce next match
        }
        
        updateTournamentDisplay();
    }

    function resetMatch() {
        playerScore = 0;
        computerScore = 0;
        document.getElementById('rightPlayerScore').textContent = '0';
        document.getElementById('leftPlayerScore').textContent = '0';
        resetBall();
        gameActive = true;
    }

    function endTournament(winner) {
        const messageElement = gameOverMessage.querySelector('h2');
        messageElement.className = 'text-white text-center display-8 font-monospace';
        messageElement.textContent = `Tournament Winner: ${winner}!`;
        gameOverMessage.classList.remove('d-none');
        setTimeout(() => {
            window.location.href = '/';
        }, 3000);
    }

    // Modify initialization
    if (mode === 'TOURNAMENT') {
        initTournament();
    } else {
        fetchUsername().then(() => {
            updateGameInfo();
            setTimeout(() => {
                announceNormalMatch();
            }, 100);
        });
    }

    // Add announceNormalMatch for PVP/AI modes
    function announceNormalMatch() {
        gameActive = false;
        gameStarted = false;  // Ensure ball doesn't move
        
        const player1 = mode === 'PVP' ? player2Name : 'Computer';
        const player2 = username || 'Player';
        
        const messageElement = gameOverMessage.querySelector('h2');
        messageElement.className = 'text-white text-center display-8 font-monospace';
        messageElement.innerHTML = `${player2} vs ${player1}<br><span class="countdown">Match starting in 3</span>`;
        gameOverMessage.classList.remove('d-none');
        
        let count = 2;
        const countdownInterval = setInterval(() => {
            if (count > 0) {
                messageElement.innerHTML = `${player2} vs ${player1}<br><span class="countdown">Match starting in ${count}</span>`;
                count--;
            } else {
                clearInterval(countdownInterval);
                gameOverMessage.classList.add('d-none');
                resetMatch();
                gameStarted = true;  // Now allow ball movement
                gameActive = true;
            }
        }, 1000);
    }

    function updateTournamentDisplay() {
        const bracketDiv = document.getElementById('tournamentBracket');
        const currentMatchDiv = document.getElementById('currentMatch');
        const upcomingDiv = document.getElementById('upcomingMatches');
        
        if (mode !== 'TOURNAMENT') {
            bracketDiv.classList.add('d-none');
            return;
        }

        bracketDiv.classList.remove('d-none');
        
        // Championship match check
        if ((tournamentBracket[0].length === 4 && currentRound === 1) || 
            (tournamentBracket[0].length === 8 && currentRound === 2)) {
            currentMatchDiv.innerHTML = 'Championship Match';
            upcomingDiv.textContent = '';
            return;
        }

        // Regular matches announcements
        let nextMatchText = '';
        
        if (tournamentBracket[0].length === 8) {
            if (currentRound === 0) {
                if (currentMatchIndex === 6) {
                    // Last first round match (7-8)
                    nextMatchText = `Next: ${bracketWinners['1-2']} VS ${bracketWinners['3-4']}`;
                } else {
                    // Show remaining first round matches
                    const remaining = tournamentBracket[0].slice(currentMatchIndex + 2);
                    if (remaining.length > 0) {
                        const pairs = remaining.reduce((acc, player, i) => {
                            if (i % 2 === 0) acc.push(`${player} vs ${remaining[i + 1]}`);
                            return acc;
                        }, []);
                        nextMatchText = `Next: ${pairs.join(' → ')}`;
                    }
                }
            } else if (currentRound === 1) {
                // Semifinals
                nextMatchText = currentMatchIndex === 0 ?
                    `Next: ${bracketWinners['5-6']} VS ${bracketWinners['7-8']}` :
                    `Winner advances to play against ${bracketWinners['semi1']}`;
            }
        } else {
            // 4 player tournament
            nextMatchText = currentRound === 0 ?
                (currentMatchIndex === 0 ? 'Next: 3 vs 4' : 
                 `Winner advances to play against ${bracketWinners['1-2']}`) : '';
        }
        
        upcomingDiv.textContent = nextMatchText;
    }
}

// Initialize when script loads
document.addEventListener('DOMContentLoaded', initGame);