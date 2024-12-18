document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('pongCanvas');
    const context = canvas.getContext('2d');
    const startButton = document.getElementById('startButton');
    
    let gameInterval;
    let playerPaddleY = 150;
    let computerPaddleY = 150;
    let ballX = 300;
    let ballY = 200;
    let ballSpeedX = 5;
    let ballSpeedY = 5;
    
    const paddleHeight = 100;
    const paddleWidth = 10;
    
    function drawGame() {
        // Clear canvas
        context.clearRect(0, 0, canvas.width, canvas.height);
        
        // Draw paddles
        context.fillStyle = 'black';
        context.fillRect(50, playerPaddleY, paddleWidth, paddleHeight); // Player paddle
        context.fillRect(canvas.width - 60, computerPaddleY, paddleWidth, paddleHeight); // Computer paddle
        
        // Draw ball
        context.beginPath();
        context.arc(ballX, ballY, 10, 0, Math.PI * 2);
        context.fill();
    }
    
    function updateGame() {
        // Move ball
        ballX += ballSpeedX;
        ballY += ballSpeedY;
        
        // Ball collision with top and bottom
        if (ballY < 0 || ballY > canvas.height) {
            ballSpeedY = -ballSpeedY;
        }
        
        // Ball collision with paddles
        if ((ballX < 60 && ballY > playerPaddleY && ballY < playerPaddleY + paddleHeight) ||
            (ballX > canvas.width - 70 && ballY > computerPaddleY && ballY < computerPaddleY + paddleHeight)) {
            ballSpeedX = -ballSpeedX;
        }
        
        // Score points
        if (ballX < 0 || ballX > canvas.width) {
            if (ballX < 0) {
                document.getElementById('computerScore').textContent = 
                    parseInt(document.getElementById('computerScore').textContent) + 1;
            } else {
                document.getElementById('playerScore').textContent = 
                    parseInt(document.getElementById('playerScore').textContent) + 1;
            }
            
            // Reset ball
            ballX = canvas.width / 2;
            ballY = canvas.height / 2;
            ballSpeedX = -ballSpeedX;
        }
        
        // Move computer paddle
        if (computerPaddleY + paddleHeight/2 < ballY) {
            computerPaddleY += 5;
        } else {
            computerPaddleY -= 5;
        }
        
        drawGame();
    }
    
    canvas.addEventListener('mousemove', (event) => {
        const rect = canvas.getBoundingClientRect();
        playerPaddleY = event.clientY - rect.top - paddleHeight/2;
        
        // Keep paddle within canvas bounds
        if (playerPaddleY < 0) playerPaddleY = 0;
        if (playerPaddleY + paddleHeight > canvas.height) playerPaddleY = canvas.height - paddleHeight;
    });
    
    startButton.addEventListener('click', () => {
        // Clear any existing game interval
        if (gameInterval) clearInterval(gameInterval);
        
        // Reset scores
        document.getElementById('playerScore').textContent = '0';
        document.getElementById('computerScore').textContent = '0';
        
        // Start game loop
        gameInterval = setInterval(updateGame, 1000/60);
    });
    
    // Initial draw
    drawGame();
});