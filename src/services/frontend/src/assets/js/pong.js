const canvas = document.getElementById('pongCanvas');
const ctx = canvas.getContext('2d');

let gameState = {
	paddleColor: '#FFFFFF',
	ballColor: '#FFFFFF',
	gameSpeed: 5,
	playerScore: 0,
	computerScore: 0,
	ball: {
		x: canvas.width / 2,
		y: canvas.height / 2,
		dx: 5,
		dy: 5,
		radius: 10
	},
	playerPaddle: {
		x: 50,
		y: canvas.height / 2 - 40,
		width: 10,
		height: 80
	},
	computerPaddle: {
		x: canvas.width - 60,
		y: canvas.height / 2 - 40,
		width: 10,
		height: 80
	}
};

// Event listeners for settings
document.getElementById('paddleColor').addEventListener('change', (e) => {
	gameState.paddleColor = e.target.value;
});

document.getElementById('ballColor').addEventListener('change', (e) => {
	gameState.ballColor = e.target.value;
});

document.getElementById('gameSpeed').addEventListener('change', (e) => {
	gameState.gameSpeed = parseInt(e.target.value);
});

// Mouse movement for player paddle
canvas.addEventListener('mousemove', (e) => {
	const rect = canvas.getBoundingClientRect();
	const mouseY = e.clientY - rect.top;
	gameState.playerPaddle.y = mouseY - gameState.playerPaddle.height / 2;
});

function drawBall() {
	ctx.beginPath();
	ctx.arc(gameState.ball.x, gameState.ball.y, gameState.ball.radius, 0, Math.PI * 2);
	ctx.fillStyle = gameState.ballColor;
	ctx.fill();
	ctx.closePath();
}

function drawPaddle(paddle) {
	ctx.fillStyle = gameState.paddleColor;
	ctx.fillRect(paddle.x, paddle.y, paddle.width, paddle.height);
}

function updateBall() {
	gameState.ball.x += gameState.ball.dx * gameState.gameSpeed;
	gameState.ball.y += gameState.ball.dy * gameState.gameSpeed;

	// Wall collisions
	if (gameState.ball.y + gameState.ball.radius > canvas.height || 
		gameState.ball.y - gameState.ball.radius < 0) {
		gameState.ball.dy *= -1;
	}

	// Paddle collisions
	if (checkPaddleCollision(gameState.playerPaddle) || 
		checkPaddleCollision(gameState.computerPaddle)) {
		gameState.ball.dx *= -1;
	}

	// Score points
	if (gameState.ball.x + gameState.ball.radius > canvas.width) {
		gameState.playerScore++;
		resetBall();
	} else if (gameState.ball.x - gameState.ball.radius < 0) {
		gameState.computerScore++;
		resetBall();
	}
}

function checkPaddleCollision(paddle) {
	return gameState.ball.x + gameState.ball.radius > paddle.x &&
		   gameState.ball.x - gameState.ball.radius < paddle.x + paddle.width &&
		   gameState.ball.y + gameState.ball.radius > paddle.y &&
		   gameState.ball.y - gameState.ball.radius < paddle.y + paddle.height;
}

function updateComputerPaddle() {
	const paddleCenter = gameState.computerPaddle.y + gameState.computerPaddle.height / 2;
	if (paddleCenter < gameState.ball.y - 35) {
		gameState.computerPaddle.y += 5;
	} else if (paddleCenter > gameState.ball.y + 35) {
		gameState.computerPaddle.y -= 5;
	}
}

function resetBall() {
	gameState.ball.x = canvas.width / 2;
	gameState.ball.y = canvas.height / 2;
	gameState.ball.dx *= -1;
}

function updateScore() {
	document.getElementById('playerScore').textContent = gameState.playerScore;
	document.getElementById('computerScore').textContent = gameState.computerScore;
}

function gameLoop() {
	ctx.clearRect(0, 0, canvas.width, canvas.height);
	
	drawBall();
	drawPaddle(gameState.playerPaddle);
	drawPaddle(gameState.computerPaddle);
	
	updateBall();
	updateComputerPaddle();
	updateScore();
	
	requestAnimationFrame(gameLoop);
}

gameLoop();