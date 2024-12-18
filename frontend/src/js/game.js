document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('pongCanvas');
    const context = canvas.getContext('2d');
    const startButton = document.getElementById('startButton');
    
    // Game colors
    const COLORS = {
        paddle: '#50e3c2',
        ball: '#ff6b6b',
        centerLine: 'rgba(74, 144, 226, 0.5)',
        score: '#ffffff',
        particles: ['#4a90e2', '#50e3c2', '#ff6b6b']
    };
    
    // Game state
    let gameInterval;
    let player1PaddleY = 150;
    let player2PaddleY = 150;
    let ballX = 300;
    let ballY = 200;
    let ballSpeedX = 5;
    let ballSpeedY = 5;
    let particles = [];
    let gameStarted = false;
    let gameSpeed = 1;
    
    // Game constants
    const PADDLE_HEIGHT = 100;
    const PADDLE_WIDTH = 10;
    const PADDLE_SPEED = 7;
    const BALL_SIZE = 8;
    const INITIAL_BALL_SPEED = 5;
    
    // Particle class
    class Particle {
        constructor(x, y) {
            this.x = x;
            this.y = y;
            this.vx = (Math.random() - 0.5) * 8;
            this.vy = (Math.random() - 0.5) * 8;
            this.life = 1;
            this.size = Math.random() * 3 + 2;
            this.color = COLORS.particles[Math.floor(Math.random() * COLORS.particles.length)];
            this.rotation = Math.random() * Math.PI * 2;
            this.rotationSpeed = (Math.random() - 0.5) * 0.2;
        }

        update() {
            this.x += this.vx;
            this.y += this.vy;
            this.life -= 0.02;
            this.rotation += this.rotationSpeed;
        }

        draw(ctx) {
            ctx.save();
            ctx.translate(this.x, this.y);
            ctx.rotate(this.rotation);
            ctx.fillStyle = this.color;
            ctx.globalAlpha = this.life;
            ctx.fillRect(-this.size/2, -this.size/2, this.size, this.size);
            ctx.restore();
        }
    }
    
    // Track pressed keys
    const keys = {
        w: false,
        s: false,
        ArrowUp: false,
        ArrowDown: false
    };
    
    function createParticles(x, y, count = 10) {
        for (let i = 0; i < count; i++) {
            particles.push(new Particle(x, y));
        }
    }
    
    function drawGame() {
        // Clear canvas with fade effect
        context.fillStyle = 'rgba(22, 33, 62, 0.2)';
        context.fillRect(0, 0, canvas.width, canvas.height);
        
        // Draw paddles with glow effect
        context.shadowBlur = 15;
        context.shadowColor = COLORS.paddle;
        context.fillStyle = COLORS.paddle;
        
        // Player 1 paddle
        context.fillRect(50, player1PaddleY, PADDLE_WIDTH, PADDLE_HEIGHT);
        
        // Player 2 paddle
        context.fillRect(canvas.width - 60, player2PaddleY, PADDLE_WIDTH, PADDLE_HEIGHT);
        
        // Draw ball with glow
        context.shadowBlur = 20;
        context.shadowColor = COLORS.ball;
        context.fillStyle = COLORS.ball;
        context.beginPath();
        context.arc(ballX, ballY, BALL_SIZE, 0, Math.PI * 2);
        context.fill();
        
        // Reset shadow
        context.shadowBlur = 0;
        
        // Draw center line
        context.setLineDash([5, 15]);
        context.beginPath();
        context.moveTo(canvas.width / 2, 0);
        context.lineTo(canvas.width / 2, canvas.height);
        context.strokeStyle = COLORS.centerLine;
        context.stroke();
        
        // Update and draw particles
        particles.forEach((particle, index) => {
            particle.update();
            particle.draw(context);
            if (particle.life <= 0) {
                particles.splice(index, 1);
            }
        });
    }
    
    function updatePaddles() {
        if (keys.w && player1PaddleY > 0) {
            player1PaddleY -= PADDLE_SPEED * gameSpeed;
        }
        if (keys.s && player1PaddleY < canvas.height - PADDLE_HEIGHT) {
            player1PaddleY += PADDLE_SPEED * gameSpeed;
        }
        
        if (keys.ArrowUp && player2PaddleY > 0) {
            player2PaddleY -= PADDLE_SPEED * gameSpeed;
        }
        if (keys.ArrowDown && player2PaddleY < canvas.height - PADDLE_HEIGHT) {
            player2PaddleY += PADDLE_SPEED * gameSpeed;
        }
    }
    
    function updateBall() {
        ballX += ballSpeedX * gameSpeed;
        ballY += ballSpeedY * gameSpeed;
        
        // Top and bottom collisions
        if (ballY < BALL_SIZE || ballY > canvas.height - BALL_SIZE) {
            ballSpeedY = -ballSpeedY;
            createParticles(ballX, ballY, 5);
        }
        
        // Paddle collisions
        // Player 1 paddle
        if (ballX < 60 && ballX > 40 && 
            ballY > player1PaddleY && ballY < player1PaddleY + PADDLE_HEIGHT) {
            ballSpeedX = Math.abs(ballSpeedX);
            ballSpeedY = (ballY - (player1PaddleY + PADDLE_HEIGHT/2)) * 0.2;
            createParticles(ballX, ballY);
            increaseDifficulty();
        }
        
        // Player 2 paddle
        if (ballX > canvas.width - 70 && ballX < canvas.width - 50 && 
            ballY > player2PaddleY && ballY < player2PaddleY + PADDLE_HEIGHT) {
            ballSpeedX = -Math.abs(ballSpeedX);
            ballSpeedY = (ballY - (player2PaddleY + PADDLE_HEIGHT/2)) * 0.2;
            createParticles(ballX, ballY);
            increaseDifficulty();
        }
        
        // Score points
        if (ballX < 0 || ballX > canvas.width) {
            if (ballX < 0) {
                updateScore('player2Score');
                createParticles(0, ballY, 20);
            } else {
                updateScore('player1Score');
                createParticles(canvas.width, ballY, 20);
            }
            resetBall();
        }
    }
    
    function updateScore(playerId) {
        const scoreElement = document.getElementById(playerId);
        scoreElement.textContent = parseInt(scoreElement.textContent) + 1;
        // Add visual feedback
        scoreElement.style.transform = 'scale(1.2)';
        setTimeout(() => {
            scoreElement.style.transform = 'scale(1)';
        }, 200);
    }
    
    function increaseDifficulty() {
        gameSpeed = Math.min(gameSpeed + 0.01, 1.5);
    }
    
    function resetBall() {
        ballX = canvas.width / 2;
        ballY = canvas.height / 2;
        gameSpeed = 1;
        ballSpeedX = INITIAL_BALL_SPEED * (Math.random() > 0.5 ? 1 : -1);
        ballSpeedY = (Math.random() - 0.5) * 6;
    }
    
    function updateGame() {
        if (!gameStarted) return;
        updatePaddles();
        updateBall();
        drawGame();
    }
    
    // Keyboard event listeners
    document.addEventListener('keydown', (event) => {
        if (event.key in keys) {
            keys[event.key] = true;
            event.preventDefault();
        }
    });
    
    document.addEventListener('keyup', (event) => {
        if (event.key in keys) {
            keys[event.key] = false;
        }
    });
    
    // Start button event listener
    startButton.addEventListener('click', () => {
        // Clear any existing game interval
        if (gameInterval) {
            clearInterval(gameInterval);
        }
        
        // Reset scores
        document.getElementById('player1Score').textContent = '0';
        document.getElementById('player2Score').textContent = '0';
        
        // Reset game state
        gameStarted = true;
        gameSpeed = 1;
        particles = [];
        player1PaddleY = canvas.height / 2 - PADDLE_HEIGHT / 2;
        player2PaddleY = canvas.height / 2 - PADDLE_HEIGHT / 2;
        resetBall();
        
        // Start game loop
        gameInterval = setInterval(updateGame, 1000/60);
        
        // Update button text
        startButton.textContent = 'Restart Game';
    });
    
    // Initial draw
    drawGame();
});