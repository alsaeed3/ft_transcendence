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
    let ballY = canvas.height / 2;
    let ballSpeedX = BALL_SPEED;
    let ballSpeedY = BALL_SPEED;

    // AI properties
    let lastAIUpdate = Date.now();
    const AI_UPDATE_INTERVAL = 1000;    // Rule: 1-second refresh rate
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
    let player2Name = mode === 'PVP' ? localStorage.getItem('player2Name') : 'Computer';

    // Fetch username at start
    async function fetchUsername() {
        try {
            const response = await fetch(`${API_BASE}users/profile/`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
                    'Content-Type': 'application/json'
                }
            });
            
            if (response.ok) {
                const userData = await response.json();
                username = userData.username;
                // Update the display name immediately after fetching
                document.getElementById('rightPlayerName').textContent = username;
            }
        } catch (error) {
            console.error('Error fetching username:', error);
        }
    }

    // Add this check before fetching:
    if (mode !== 'TOURNAMENT') {
        fetchUsername();
    }

    function updateAI() {
        // Only recalculate target position every second
        if (Date.now() - lastAIUpdate >= AI_UPDATE_INTERVAL) {
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
            lastAIUpdate = Date.now();
        }
        
        // Simulate keyboard input
        const paddleCenter = paddle1Y + paddleHeight/2;
        const distanceToTarget = targetY - paddleCenter;
        
        // Reset movement flags
        aiMoveUp = false;
        aiMoveDown = false;
        
        // Set movement flags based on target position (simulating keyboard)
        if (Math.abs(distanceToTarget) > 10) {  // Deadzone to prevent jitter
            if (distanceToTarget < 0) {
                aiMoveUp = true;
            } else {
                aiMoveDown = true;
            }
        }
        
        // Move paddle based on simulated keyboard input
        if (aiMoveUp) {
            paddle1Y = Math.max(0, paddle1Y - PADDLE_SPEED);
        } else if (aiMoveDown) {
            paddle1Y = Math.min(canvas.height - paddleHeight, paddle1Y + PADDLE_SPEED);
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
                
                gameOverMessage.querySelector('h2').textContent = `${winner} wins the match!`;
                gameOverMessage.classList.remove('d-none');
                
                setTimeout(() => {
                    gameOverMessage.classList.add('d-none');
                    startNextTournamentMatch();
                }, 2000);
            } else {
                // Regular PVP/AI win condition
                const winner = playerScore > computerScore ? 
                    `${username} WINS` : 
                    (mode === 'PVP' ? `${player2Name} WINS` : 'COMPUTER WINS');
                gameOverMessage.querySelector('h2').textContent = winner;
                gameOverMessage.classList.remove('d-none');
                
                // Only save match result for non-tournament games
                saveMatchResult(playerScore, computerScore);
                
                setTimeout(() => {
                    window.location.href = '/';
                }, 3000);
            }
        }
    }

    async function saveMatchResult(playerScore, computerScore) {
        try {
            let currentToken = localStorage.getItem('accessToken');
            if (!currentToken) {
                throw new Error('No access token available');
            }

            let response = await fetch(`${API_BASE}users/profile/`, {
                headers: {
                    'Authorization': `Bearer ${currentToken}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.status === 401) {
                try {
                    currentToken = await window.refreshAccessToken();
                    response = await fetch(`${API_BASE}users/profile/`, {
                        headers: {
                            'Authorization': `Bearer ${currentToken}`,
                            'Content-Type': 'application/json'
                        }
                    });
                } catch (refreshError) {
                    localStorage.clear();
                    setTimeout(() => {
                        window.location.href = '/';
                    }, 3000);
                    throw refreshError;
                }
            }

            if (!response.ok) {
                throw new Error('Failed to get user profile');
            }

            const userData = await response.json();

            // Save match with valid token
            const matchData = {
                tournament: null,
                player1: userData.id,
                player2: userData.id,
                player1_score: playerScore,
                player2_score: computerScore,
                start_time: new Date().toISOString(),
                end_time: new Date().toISOString(),
                winner: playerScore > computerScore ? userData.id : userData.id,
                match_type: mode === 'PVP' ? 'PVP' : 'AI'  // Explicitly set match type
            };

            const matchResponse = await fetch(`${API_BASE}matches/`, {
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

            // Store player2 name with match ID
            const savedMatch = await matchResponse.json();
            if (mode === 'PVP') {
                const matchKey = `match_${savedMatch.id}_player2`;
                localStorage.setItem(matchKey, player2Name);
                
                // Also store match type
                const matchTypeKey = `match_${savedMatch.id}_type`;
                localStorage.setItem(matchTypeKey, 'PVP');
            }

            // Redirect only after successful save
            setTimeout(() => {
                window.location.href = '/';
            }, 3000);

        } catch (error) {
            console.error('Error saving match:', error);
            if (error.message.includes('token') || error.message.includes('401')) {
                localStorage.clear();
                setTimeout(() => {
                    window.location.href = '/';
                }, 3000);
            }
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
        // Reset ball speed to initial value when point ends
        BALL_SPEED = 6;  // Reset to initial speed
        
        ballX = canvas.width / 2;
        ballY = canvas.height / 2;
        ballSpeedX = BALL_SPEED * (Math.random() < 0.5 ? 1 : -1);
        ballSpeedY = BALL_SPEED * (Math.random() < 0.5 ? 0.5 : -0.5);
        calculationMade = false;
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
                if (mode === 'PVP' || mode === 'TOURNAMENT') {
                    paddle2Y = Math.max(0, paddle2Y - PADDLE_SPEED);
                }
                break;
            case 'l':
                if (mode === 'PVP' || mode === 'TOURNAMENT') {
                    paddle2Y = Math.min(canvas.height - paddleHeight, paddle2Y + PADDLE_SPEED);
                }
                break;
            case 'w':  // Left player controls
                if (mode === 'PVP' || mode === 'TOURNAMENT') {
                    paddle1Y = Math.max(0, paddle1Y - PADDLE_SPEED);
                }
                break;
            case 's':
                if (mode === 'PVP' || mode === 'TOURNAMENT') {
                    paddle1Y = Math.min(canvas.height - paddleHeight, paddle1Y + PADDLE_SPEED);
                }
                break;
        }
    });

    let lastTime = 0;
    const targetFPS = 60;
    const frameInterval = 1000 / targetFPS;

    function gameLoop(currentTime) {
        if (!lastTime) lastTime = currentTime;
        
        const deltaTime = currentTime - lastTime;
        
        if (deltaTime >= frameInterval && gameActive) {
            if (mode === 'AI') {
                updateAI();  // Only run AI in AI mode
            }
            moveBall();
            draw();
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
        
        if (mode === 'TOURNAMENT' && tournamentBracket[currentRound]?.length > currentMatchIndex + 1) {
            document.getElementById('rightPlayerName').textContent = tournamentBracket[currentRound][currentMatchIndex];
            document.getElementById('leftPlayerName').textContent = tournamentBracket[currentRound][currentMatchIndex + 1];
        } else {
            document.getElementById('rightPlayerName').textContent = username || 'Loading...';
            document.getElementById('leftPlayerName').textContent = mode === 'PVP' ? player2Name : 'Computer';
        }
    }

    // Add at the top with other game variables
    let tournamentPlayers = [];
    let currentMatchIndex = 0;
    let currentRound = 0;
    let tournamentBracket = [];
    let matchNumber = 1;  // Add this to track match numbers

    function initTournament() {
        tournamentPlayers = JSON.parse(localStorage.getItem('tournamentPlayers') || '[]');
        tournamentBracket = [tournamentPlayers];
        currentMatchIndex = 0;
        currentRound = 0;
        matchNumber = 1;  // Start with first match
        
        updateGameInfo();
        resetMatch();
    }

    function startNextTournamentMatch() {
        currentMatchIndex += 2;
        
        if (currentMatchIndex >= tournamentBracket[currentRound].length) {
            const winners = tournamentBracket[currentRound].filter(player => player !== null);
            
            if (winners.length > 1) {
                currentRound++;
                currentMatchIndex = 0;
                tournamentBracket[currentRound] = winners;
                matchNumber++;  // Increment match number
                updateGameInfo();
                resetMatch();
            } else {
                endTournament(winners[0] || 'No winner');
            }
        } else {
            matchNumber++;  // Increment match number
            updateGameInfo();
            resetMatch();
        }
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
        gameOverMessage.querySelector('h2').textContent = `Tournament Winner: ${winner}!`;
        gameOverMessage.classList.remove('d-none');
        setTimeout(() => {
            window.location.href = '/';
        }, 3000);
    }

    // Initialize based on mode
    if (mode === 'TOURNAMENT') {
        // For tournament mode, skip username fetch entirely
        initTournament();
    } else {
        // Only fetch username for non-tournament modes
        fetchUsername().then(() => {
            updateGameInfo();
        });
    }
}

// Initialize when script loads
document.addEventListener('DOMContentLoaded', initGame);