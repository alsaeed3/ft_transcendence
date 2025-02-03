function initGame() {
    const canvas = document.getElementById('pongCanvas');
    if (!canvas) return; // Exit if canvas isn't loaded yet
    
    const ctx = canvas.getContext('2d', { alpha: false }); // Optimize for non-transparent canvas

    // Score elements
    const playerScoreElement = document.getElementById('playerScore');
    const computerScoreElement = document.getElementById('computerScore');
    let playerScore = 0;
    let computerScore = 0;

    // Game settings as variables
    let paddleWidth = 20;
    let paddleHeight = 120;
    let ballRadius = 10;
    let PADDLE_SPEED = 5;
    let BALL_SPEED = 4;

    // Game state
    let paddle1Y = canvas.height / 2 - paddleHeight / 2;
    let paddle2Y = canvas.height / 2 - paddleHeight / 2;
    let ballX = canvas.width / 2;
    let ballY = canvas.height / 2;
    let ballSpeedX = BALL_SPEED;
    let ballSpeedY = BALL_SPEED;

    // AI properties
    let lastAIUpdate = Date.now();
    const AI_UPDATE_INTERVAL = 1000; // Strict 1-second refresh rate
    let aiMoveUp = false;    // Simulated keyboard up
    let aiMoveDown = false;  // Simulated keyboard down
    let targetY = canvas.height / 2;

    const WINNING_SCORE = 2;
    let gameActive = true;
    const gameOverMessage = document.getElementById('gameOverMessage');

    function updateAI() {
        const currentTime = Date.now();
        
        // Only update AI decisions once per second (rule: 1-second refresh rate)
        if (currentTime - lastAIUpdate >= AI_UPDATE_INTERVAL) {
            // Reset simulated keyboard inputs (rule: simulate human input)
            aiMoveUp = false;
            aiMoveDown = false;
            
            if (ballSpeedX < 0) { // Ball moving towards AI
                // Simple bounce prediction (rule: anticipate bounces)
                let predictedY = ballY + (ballSpeedY * (ballX / -ballSpeedX));
                
                // Handle bounces off walls
                while (predictedY < 0 || predictedY > canvas.height) {
                    if (predictedY < 0) {
                        predictedY = -predictedY;
                    } else {
                        predictedY = canvas.height - (predictedY - canvas.height);
                    }
                }
                
                // Add slight randomization to target position
                targetY = predictedY + (Math.random() * 100 - 50);
            } else {
                // Return to center when ball moving away
                targetY = canvas.height / 2 + (Math.random() * 100 - 50);
            }
            
            lastAIUpdate = currentTime;
        }
        
        // Simulate keyboard controls (rule: simulate human input)
        const paddleCenter = paddle1Y + paddleHeight/2;
        if (paddleCenter < targetY - 30) {
            aiMoveDown = true;
        } else if (paddleCenter > targetY + 30) {
            aiMoveUp = true;
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
            const winner = playerScore > computerScore ? 'PLAYER WINS' : 'COMPUTER WINS';
            gameOverMessage.querySelector('h2').textContent = winner;
            gameOverMessage.classList.remove('d-none');
            
            // Save match result
            saveMatchResult(playerScore, computerScore);
            
            // Return to main menu after delay
            setTimeout(() => {
                window.location.href = '/';
            }, 3000);
        }
    }

    async function saveMatchResult(playerScore, computerScore) {
        try {
            // Get current access token
            const accessToken = localStorage.getItem('accessToken');
            if (!accessToken) {
                throw new Error('No access token available');
            }

            // First try to get user profile with current token
            let response = await fetch(`${API_BASE}users/profile/`, {
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                }
            });

            // If token expired, try to refresh it
            if (response.status === 401) {
                const refreshToken = localStorage.getItem('refreshToken');
                if (!refreshToken) {
                    throw new Error('No refresh token available');
                }

                const refreshResponse = await fetch(`${API_BASE}auth/token/refresh/`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ refresh: refreshToken })
                });

                if (!refreshResponse.ok) {
                    throw new Error('Token refresh failed');
                }

                const tokenData = await refreshResponse.json();
                localStorage.setItem('accessToken', tokenData.access);
                
                // Retry profile fetch with new token
                response = await fetch(`${API_BASE}users/profile/`, {
                    headers: {
                        'Authorization': `Bearer ${tokenData.access}`,
                        'Content-Type': 'application/json'
                    }
                });
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
                winner: userData.id
            };

            const matchResponse = await fetch(`${API_BASE}matches/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
                },
                body: JSON.stringify(matchData)
            });

            if (!matchResponse.ok) {
                throw new Error('Failed to save match result');
            }

            // Only redirect after successful match save
            setTimeout(() => {
                window.location.href = '/';
            }, 3000);

        } catch (error) {
            console.error('Error saving match:', error);
            // On any auth error, redirect to login after showing game over
            setTimeout(() => {
                localStorage.clear();
                window.location.href = '/';
            }, 3000);
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
        ballX = canvas.width / 2;
        ballY = canvas.height / 2;
        ballSpeedX = BALL_SPEED * (Math.random() < 0.5 ? 1 : -1);
        ballSpeedY = BALL_SPEED * (Math.random() < 0.5 ? 0.5 : -0.5);
    }

    // Make updateGameSettings available globally
    window.updateGameSettings = function(newWidth, newHeight, newPaddleSpeed, newBallSpeed) {
        paddleWidth = newWidth;
        paddleHeight = newHeight;
        PADDLE_SPEED = newPaddleSpeed;
        BALL_SPEED = newBallSpeed;
        
        ballSpeedX = BALL_SPEED * (ballSpeedX > 0 ? 1 : -1);
        ballSpeedY = BALL_SPEED * (ballSpeedY > 0 ? 1 : -1);
    };

    // Keyboard controls
    document.addEventListener('keydown', (event) => {
        switch(event.key.toLowerCase()) {
            case 'p':  // Up - changed from 'w'
                paddle2Y = Math.max(0, paddle2Y - PADDLE_SPEED);
                break;
            case 'l':  // Down - changed from 's'
                paddle2Y = Math.min(canvas.height - paddleHeight, paddle2Y + PADDLE_SPEED);
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
            updateAI();
            moveBall();
            draw();
            lastTime = currentTime - (deltaTime % frameInterval);
        }
        
        requestAnimationFrame(gameLoop);
    }

    // Start the game loop
    requestAnimationFrame(gameLoop);
}

// Initialize when script loads
if (document.readyState === 'complete') {
    initGame();
} else {
    window.addEventListener('load', initGame);
}