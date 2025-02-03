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

    function moveBall() {
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
                resetBall();
            }
        }
        
        if (ballX >= canvas.width - paddleWidth) {
            if (ballY >= paddle2Y && ballY <= paddle2Y + paddleHeight) {
                ballSpeedX = -Math.abs(BALL_SPEED);
                ballSpeedY = ((ballY - (paddle2Y + paddleHeight/2)) / (paddleHeight/2)) * BALL_SPEED;
            } else if (ballX > canvas.width) {
                computerScore++;
                computerScoreElement.textContent = computerScore;
                resetBall();
            }
        }
    }

    function draw() {
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        ctx.fillStyle = '#fff';
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
            case 'w':
                paddle2Y = Math.max(0, paddle2Y - PADDLE_SPEED);
                break;
            case 's':
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
        
        if (deltaTime >= frameInterval) {
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