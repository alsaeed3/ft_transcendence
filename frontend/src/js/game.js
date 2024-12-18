document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('pongCanvas');
    const context = canvas.getContext('2d');
    const startButton = document.getElementById('startButton');
    
    let gameInterval;
    let player1PaddleY = 150;
    let player2PaddleY = 150;
    let ballX = 300;
    let ballY = 200;
    let ballSpeedX = 5;
    let ballSpeedY = 5;
    
    const paddleHeight = 100;
    const paddleWidth = 10;
    const paddleSpeed = 7;
    
    // Keep track of pressed keys
    const keys = {
        w: false,
        s: false,
        ArrowUp: false,
        ArrowDown: false
    };
    
    function drawGame() {
        // Clear canvas
        context.clearRect(0, 0, canvas.width, canvas.height);
        
        // Draw paddles
        context.fillStyle = 'black';
        context.fillRect(50, player1PaddleY, paddleWidth, paddleHeight); // Player 1 paddle
        context.fillRect(canvas.width - 60, player2PaddleY, paddleWidth, paddleHeight); // Player 2 paddle
        
        // Draw ball
        context.beginPath();
        context.arc(ballX, ballY, 10, 0, Math.PI * 2);
        context.fill();
        
        // Draw center line
        context.setLineDash([5, 15]);
        context.beginPath();
        context.moveTo(canvas.width / 2, 0);
        context.lineTo(canvas.width / 2, canvas.height);
        context.strokeStyle = 'black';
        context.stroke();
    }
    
    function updatePaddles() {
        // Player 1 (W/S keys)
        if (keys.w && player1PaddleY > 0) {
            player1PaddleY -= paddleSpeed;
        }
        if (keys.s && player1PaddleY < canvas.height - paddleHeight) {
            player1PaddleY += paddleSpeed;
        }
        
        // Player 2 (Arrow keys)
        if (keys.ArrowUp && player2PaddleY > 0) {
            player2PaddleY -= paddleSpeed;
        }
        if (keys.ArrowDown && player2PaddleY < canvas.height - paddleHeight) {
            player2PaddleY += paddleSpeed;
        }
    }
    
    function updateGame() {
        updatePaddles();
        
        // Move ball
        ballX += ballSpeedX;
        ballY += ballSpeedY;
        
        // Ball collision with top and bottom
        if (ballY < 0 || ballY > canvas.height) {
            ballSpeedY = -ballSpeedY;
        }
        
        // Ball collision with paddles
        // Player 1 paddle
        if (ballX < 60 && ballX > 40 && ballY > player1PaddleY && ballY < player1PaddleY + paddleHeight) {
            ballSpeedX = Math.abs(ballSpeedX); // Ensure ball moves right
            // Add some randomness to bounce angle
            ballSpeedY = (ballY - (player1PaddleY + paddleHeight/2)) * 0.2;
        }
        // Player 2 paddle
        if (ballX > canvas.width - 70 && ballX < canvas.width - 50 && 
            ballY > player2PaddleY && ballY < player2PaddleY + paddleHeight) {
            ballSpeedX = -Math.abs(ballSpeedX); // Ensure ball moves left
            // Add some randomness to bounce angle
            ballSpeedY = (ballY - (player2PaddleY + paddleHeight/2)) * 0.2;
        }
        
        // Score points
        if (ballX < 0 || ballX > canvas.width) {
            if (ballX < 0) {
                document.getElementById('player2Score').textContent = 
                    parseInt(document.getElementById('player2Score').textContent) + 1;
            } else {
                document.getElementById('player1Score').textContent = 
                    parseInt(document.getElementById('player1Score').textContent) + 1;
            }
            
            // Reset ball to center with random direction
            ballX = canvas.width / 2;
            ballY = canvas.height / 2;
            ballSpeedX = 5 * (Math.random() > 0.5 ? 1 : -1);
            ballSpeedY = (Math.random() - 0.5) * 6;
        }
        
        drawGame();
    }
    
    // Keyboard event listeners
    document.addEventListener('keydown', (event) => {
        if (event.key in keys) {
            keys[event.key] = true;
            // Prevent scrolling with arrow keys
            event.preventDefault();
        }
    });
    
    document.addEventListener('keyup', (event) => {
        if (event.key in keys) {
            keys[event.key] = false;
        }
    });
    
    startButton.addEventListener('click', () => {
        // Clear any existing game interval
        if (gameInterval) clearInterval(gameInterval);
        
        // Reset scores
        document.getElementById('player1Score').textContent = '0';
        document.getElementById('player2Score').textContent = '0';
        
        // Reset paddles and ball
        player1PaddleY = canvas.height / 2 - paddleHeight / 2;
        player2PaddleY = canvas.height / 2 - paddleHeight / 2;
        ballX = canvas.width / 2;
        ballY = canvas.height / 2;
        ballSpeedX = 5 * (Math.random() > 0.5 ? 1 : -1);
        ballSpeedY = (Math.random() - 0.5) * 6;
        
        // Start game loop
        gameInterval = setInterval(updateGame, 1000/60);
    });
    
    // Initial draw
    drawGame();
});