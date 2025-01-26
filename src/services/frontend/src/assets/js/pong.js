const canvas = document.getElementById('pongCanvas');
const ctx = canvas.getContext('2d');

// Score elements
const playerScoreElement = document.getElementById('playerScore');
const computerScoreElement = document.getElementById('computerScore');
let playerScore = 0;
let computerScore = 0;

// Game constants
let paddleWidth = 20;
let paddleHeight = 120;
let ballRadius = 10;
let PADDLE_SPEED = 5;
let BALL_SPEED = 4;

let paddle1Y = 250, paddle2Y = 250;
let ballX = 400, ballY = 300;
let ballSpeedX = BALL_SPEED, ballSpeedY = BALL_SPEED;

// Track animation frame
let animationFrameId = null;

// Function to immediately stop the game
function stopGame() {
    if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
    }
}

// Function to force update settings
function updateGameSettings(newWidth, newHeight, newPaddleSpeed, newBallSpeed) {
    // Stop current game loop
    stopGame();
    
    // Update settings
    paddleWidth = newWidth;
    paddleHeight = newHeight;
    PADDLE_SPEED = newPaddleSpeed;
    BALL_SPEED = newBallSpeed;
    
    // Reset entire game state
    resetGame();
    
    // Restart game loop
    gameLoop();
}

// AI properties
let lastAIUpdate = Date.now();
const AI_UPDATE_INTERVAL = 1000; // 1 second refresh rate
let predictedBallY = 0;
let aiMoveUp = false;
let aiMoveDown = false;

function updateAI() {
    const currentTime = Date.now();
    
    if (currentTime - lastAIUpdate >= AI_UPDATE_INTERVAL) {
        aiMoveUp = false;
        aiMoveDown = false;
        
        if (ballSpeedX < 0) {
            predictBallPosition();
            
            const paddleCenter = paddle1Y + paddleHeight / 2;
            if (paddleCenter < predictedBallY - 10) {
                aiMoveDown = true;
            } else if (paddleCenter > predictedBallY + 10) {
                aiMoveUp = true;
            }
        }
        
        lastAIUpdate = currentTime;
    }
    
    // Use PADDLE_SPEED constant for AI movement
    if (aiMoveUp) {
        paddle1Y = Math.max(0, paddle1Y - PADDLE_SPEED);
    } else if (aiMoveDown) {
        paddle1Y = Math.min(canvas.height - paddleHeight, paddle1Y + PADDLE_SPEED);
    }
}

function predictBallPosition() {
    let futureX = ballX;
    let futureY = ballY;
    let tempSpeedX = ballSpeedX;
    let tempSpeedY = ballSpeedY;
    
    // Simulate ball trajectory with bounces
    while (futureX > paddleWidth + ballRadius) {
        futureX += tempSpeedX;
        futureY += tempSpeedY;
        
        // Calculate bounces off top and bottom
        if (futureY < ballRadius || futureY > canvas.height - ballRadius) {
            tempSpeedY = -tempSpeedY;
        }
    }
    
    // Add slight randomization for human-like behavior
    predictedBallY = futureY + (Math.random() * 20 - 10);
}

function drawRect(x, y, width, height, color) {
    ctx.fillStyle = color;
    ctx.fillRect(x, y, width, height);
}

function drawCircle(x, y, radius, color) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2, false);
    ctx.closePath();
    ctx.fill();
}

function draw() {
    // Clear canvas
    drawRect(0, 0, canvas.width, canvas.height, '#000');

    // Draw paddles
    drawRect(0, paddle1Y, paddleWidth, paddleHeight, '#fff');
    drawRect(canvas.width - paddleWidth, paddle2Y, paddleWidth, paddleHeight, '#fff');

    // Draw ball
    drawCircle(ballX, ballY, ballRadius, '#fff');
}

function checkPaddleCollision(ballX, ballY, paddleX, paddleY) {
    // Get the closest point on the paddle to the ball
    let closestX = Math.max(paddleX, Math.min(ballX, paddleX + paddleWidth));
    let closestY = Math.max(paddleY, Math.min(ballY, paddleY + paddleHeight));
    
    // Calculate the distance between the closest point and the ball center
    let distanceX = ballX - closestX;
    let distanceY = ballY - closestY;
    
    // If the distance is less than the ball's radius, collision occurred
    let distanceSquared = (distanceX * distanceX) + (distanceY * distanceY);
    return distanceSquared <= (ballRadius * ballRadius);
}

function moveBall() {
    // Move ball
    ballX += ballSpeedX;
    ballY += ballSpeedY;
    
    // Simple wall collisions
    if (ballY <= 0 || ballY >= canvas.height) {
        ballSpeedY = -ballSpeedY;
    }
    
    // Simple paddle collisions
    // Left paddle (AI)
    if (ballX <= paddleWidth) {
        if (ballY >= paddle1Y && ballY <= paddle1Y + paddleHeight) {
            ballSpeedX = Math.abs(BALL_SPEED); // Ensure ball moves right
            // Small vertical speed adjustment
            ballSpeedY = ((ballY - (paddle1Y + paddleHeight/2)) / (paddleHeight/2)) * BALL_SPEED;
        } else if (ballX < 0) {
            playerScore++;
            playerScoreElement.textContent = playerScore;
            resetBall();
        }
    }
    
    // Right paddle (Player)
    if (ballX >= canvas.width - paddleWidth) {
        if (ballY >= paddle2Y && ballY <= paddle2Y + paddleHeight) {
            ballSpeedX = -Math.abs(BALL_SPEED); // Ensure ball moves left
            // Small vertical speed adjustment
            ballSpeedY = ((ballY - (paddle2Y + paddleHeight/2)) / (paddleHeight/2)) * BALL_SPEED;
        } else if (ballX > canvas.width) {
            computerScore++;
            computerScoreElement.textContent = computerScore;
            resetBall();
        }
    }
}

function resetBall() {
    // Center the ball
    ballX = canvas.width / 2;
    ballY = canvas.height / 2;
    
    // Simple left or right direction
    ballSpeedX = BALL_SPEED * (Math.random() < 0.5 ? 1 : -1);
    ballSpeedY = BALL_SPEED * (Math.random() < 0.5 ? 0.5 : -0.5); // Smaller vertical component
}

// Update keyboard controls to use 'w' and 's'
document.addEventListener('keydown', (event) => {
    switch(event.key.toLowerCase()) {  // toLowerCase() to handle both upper and lower case
        case 'w':
            paddle2Y = Math.max(0, paddle2Y - PADDLE_SPEED);
            break;
        case 's':
            paddle2Y = Math.min(canvas.height - paddleHeight, paddle2Y + PADDLE_SPEED);
            break;
    }
});

function gameLoop() {
    if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
    }
    
    updateAI();
    moveBall();
    draw();
    
    animationFrameId = requestAnimationFrame(gameLoop);
}

// Initialize game
canvas.width = 800;
canvas.height = 600;
gameLoop();

function resetGame() {
    // Reset scores
    playerScore = 0;
    computerScore = 0;
    playerScoreElement.textContent = '0';
    computerScoreElement.textContent = '0';

    // Reset ball position and speed
    ballX = canvas.width / 2;
    ballY = canvas.height / 2;
    ballSpeedX = BALL_SPEED * (Math.random() > 0.5 ? 1 : -1);
    ballSpeedY = BALL_SPEED * (Math.random() > 0.5 ? 1 : -1);

    // Reset paddle positions
    paddle1Y = canvas.height / 2 - paddleHeight / 2;
    paddle2Y = canvas.height / 2 - paddleHeight / 2;
}

// Example usage:
// To update settings, call:
// updateGameSettings(30, 150, 8, 6);