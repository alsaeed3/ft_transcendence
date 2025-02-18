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
    const AI_DIFFICULTY = 0.85;         // Rule: Consistent challenge (0 = always miss, 1 = perfect)

    let aiMoveUp = false;              // Rule: Simulated keyboard
    let aiMoveDown = false;
    let targetY = canvas.height / 2;
    let prevBallSpeedX = ballSpeedX;   // Track ball direction changes
    let calculationMade = false;       // Ensure one calculation per approach

    const WINNING_SCORE = 3;
    let gameActive = true;
    const gameOverMessage = document.getElementById('gameOverMessage');

    // Add username variables
    let username = '';
    let player2Name = mode === 'PVP' ? localStorage.getItem('player2Name') : 'Computer';

    // Fetch username at start
    async function fetchUsername() {
        try {
            const response = await fetch(`${AuthManager.API_BASE}users/profile/`, {
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
        
        // Move paddle without delay
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

    async function saveMatchResult(matchData) {
        try {
            let currentToken = localStorage.getItem('accessToken');
            if (!currentToken) {
                throw new Error('No access token available');
            }

            let response = await fetch(`${AuthManager.API_BASE}users/profile/`, {
                headers: {
                    'Authorization': `Bearer ${currentToken}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.status === 401) {
                try {
                    currentToken = await window.refreshAccessToken();
                    response = await fetch(`${AuthManager.API_BASE}users/profile/`, {
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


            const matchResponse = await fetch(`${AuthManager.API_BASE}matches/`, {
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

            const userResponse = await fetch(`${AuthManager.API_BASE}users/profile/`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${currentToken}`,
                    'Content-Type': 'application/json'
                }
            });
    
            if (userResponse.ok) {
                const userData = await userResponse.json();
                const updateData = {
                    username: userData.username,
                    email: userData.email,
                    match_wins: userData.match_wins + (playerScore > computerScore ? 1 : 0),
                    total_matches: userData.total_matches + 1
                };
    
                await fetch(`${AuthManager.API_BASE}users/profile/`, {
                    method: 'PUT',
                    headers: {
                        'Authorization': `Bearer ${currentToken}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(updateData)
                });
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
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Draw paddles
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 4;
        ctx.setLineDash([20, 15]); // Larger dashes for authentic look
        ctx.beginPath();
        ctx.moveTo(canvas.width / 2, 0);
        ctx.lineTo(canvas.width / 2, canvas.height);
        ctx.stroke();
        ctx.setLineDash([]); // Reset dash pattern
        
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

    let keysPressed = new Set(); // Track all currently pressed keys

    document.addEventListener('keydown', (event) => {
        keysPressed.add(event.key.toLowerCase());
    });

    document.addEventListener('keyup', (event) => {
        keysPressed.delete(event.key.toLowerCase());
    });

    // Add this function to handle paddle movement
    function handlePaddleMovement() {
        if (!gameActive || !gameStarted) return;

        // Player 2 (right paddle) controls
        if (mode === 'PVP' || mode === 'TOURNAMENT' || mode === 'AI') {
            if (keysPressed.has('p')) {
                paddle2Y = Math.max(0, paddle2Y - PADDLE_SPEED);
            }
            if (keysPressed.has('l')) {
                paddle2Y = Math.min(canvas.height - paddleHeight, paddle2Y + PADDLE_SPEED);
            }
        }

        // Player 1 (left paddle) controls
        if (mode === 'PVP' || mode === 'TOURNAMENT') {
            if (keysPressed.has('w')) {
                paddle1Y = Math.max(0, paddle1Y - PADDLE_SPEED);
            }
            if (keysPressed.has('s')) {
                paddle1Y = Math.min(canvas.height - paddleHeight, paddle1Y + PADDLE_SPEED);
            }
        }
    }

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
            
            if (gameActive && gameStarted) {
                handlePaddleMovement();  // Add this line
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
        tournamentPlayers = JSON.parse(localStorage.getItem('tournamentPlayers') || '[]');
        tournamentBracket = [tournamentPlayers];
        currentMatchIndex = 0;
        currentRound = 0;
        matchNumber = 1;
        
        // Initialize game state first
        updateGameInfo();
        resetMatch();
        
        // Wait a short moment for textures to load, then show announcement
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

        paddle1Y = (canvas.height - paddleHeight) / 2;
        paddle2Y = (canvas.height - paddleHeight) / 2;
        
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
                    nextMatchText = `Next: ${bracketWinners['1-2']} VS ${bracketWinners['3-4']}`;
                } else {
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
                nextMatchText = currentMatchIndex === 0 ?
                    `Next: ${bracketWinners['5-6']} VS ${bracketWinners['7-8']}` :
                    `Winner advances to play against ${bracketWinners['semi1']}`;
            }
        } else if (tournamentBracket[0].length === 4) {
            // 4 player tournament
            if (currentRound === 0) {
                if (currentMatchIndex === 0) {
                    // First match (1-2) is being played
                    const player3 = tournamentBracket[0][2];
                    const player4 = tournamentBracket[0][3];
                    nextMatchText = `Next: ${player3} vs ${player4}`;
                } else {
                    // Second match (3-4) is being played
                    nextMatchText = `Winner advances to play against ${bracketWinners['1-2']}`;
                }
            }
        }
        
        upcomingDiv.textContent = nextMatchText;
    }
}

function init4PlayerGame() {
    // Create game container
    const gameContainer = document.createElement('div');
    gameContainer.id = 'game-container';
    gameContainer.className = 'container text-white text-center';
    document.getElementById('pong-page').appendChild(gameContainer);

    // Create and add canvas with a border
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = Math.min(window.innerWidth * 0.8, window.innerHeight * 0.8);
    canvas.className = 'mx-auto d-block mb-3';
    canvas.style.border = '2px solid white'; // Add border to see game area
    gameContainer.appendChild(canvas);
    const ctx = canvas.getContext('2d');

    // Game configuration
    const config = {
        paddleLength: canvas.width * 0.2,
        paddleThickness: canvas.width * 0.015,
        ballRadius: canvas.width * 0.01,
        paddleSpeed: canvas.width * 0.01,
        initialBallSpeed: 5,
        speedIncrease: 1.1,  // Change to 10% increase like PVP mode
        maxBallSpeed: 15,
        winningScore: 3
    };

    // Players setup
    const players = [
        { pos: (canvas.width - config.paddleLength)/2, score: 0, name: '', color: '#FF0000', keys: ['t', 'y'] },  // Top player
        { pos: (canvas.height - config.paddleLength)/2, score: 0, name: '', color: '#0000FF', keys: ['p', 'l'] },  // Right player
        { pos: (canvas.width - config.paddleLength)/2, score: 0, name: '', color: '#00FF00', keys: ['arrowleft', 'arrowright'] },  // Bottom player
        { pos: (canvas.height - config.paddleLength)/2, score: 0, name: '', color: '#FFFF00', keys: ['q', 'a'] }  // Left player
    ];

    // Create score display
    const scoreDisplay = document.createElement('div');
    scoreDisplay.className = 'd-flex justify-content-around mb-3';
    scoreDisplay.innerHTML = `
        <div class="d-flex gap-4">
            ${['Top', 'Right', 'Bottom', 'Left'].map((pos, i) => `
                <div style="color: ${players[i].color}">
                    ${pos} Player: <span id="player${i}Score">0</span>
                </div>
            `).join('')}
        </div>
    `;
    gameContainer.appendChild(scoreDisplay);

    // Add controls instructions
    const instructions = document.createElement('div');
    instructions.className = 'bg-dark bg-opacity-75 p-3 rounded mb-3';
    instructions.innerHTML = `
        <h5>Controls</h5>
        <div class="d-flex justify-content-center gap-4">
            <div style="color: ${players[0].color}">
                Top Player<br>
                T/Y
            </div>
            <div style="color: ${players[1].color}">
                Right Player<br>
                P/L
            </div>
            <div style="color: ${players[2].color}">
                Bottom Player<br>
                ←/→
            </div>
            <div style="color: ${players[3].color}">
                Left Player<br>
                Q/A
            </div>
        </div>
        <div class="mt-2">First to ${config.winningScore} points wins!</div>
    `;
    gameContainer.appendChild(instructions);

    // Game state
    const state = {
        ball: { x: canvas.width/2, y: canvas.height/2, speedX: 0, speedY: 0, speed: config.initialBallSpeed },
        lastHitPlayer: null,
        gameActive: false,
        keysPressed: new Set()
    };

    // Event listeners
    document.addEventListener('keydown', e => state.keysPressed.add(e.key.toLowerCase()));
    document.addEventListener('keyup', e => state.keysPressed.delete(e.key.toLowerCase()));

    function announceGame() {
        const announcement = document.createElement('div');
        announcement.className = 'position-absolute top-50 start-50 translate-middle text-white text-center';
        announcement.style.cssText = 'font-size: 2rem; z-index: 1000;';
        document.getElementById('pong-page').appendChild(announcement);

        // Start with count 3 and show it immediately
        announcement.innerHTML = `Game starting in 3`;
        
        let count = 2;  // Start at 2 since we already showed 3
        const countdownInterval = setInterval(() => {
            if (count > 0) {
                announcement.innerHTML = `Game starting in ${count}`;
                count--;
            } else {
                clearInterval(countdownInterval);
                announcement.remove();
                startGame();
            }
        }, 1000);
    }

    function startGame() {
        const directions = [{ x: 0, y: -1 }, { x: 1, y: 0 }, { x: 0, y: 1 }, { x: -1, y: 0 }];
        const dir = directions[Math.floor(Math.random() * 4)];
        state.ball.speedX = dir.x * state.ball.speed;
        state.ball.speedY = dir.y * state.ball.speed;
        state.gameActive = true;
    }

    function update() {
        if (!state.gameActive) return;

        // Move paddles
        players.forEach((player, index) => {
            const isVertical = index % 2;
            const maxPos = (isVertical ? canvas.height : canvas.width) - config.paddleLength;
            if (state.keysPressed.has(player.keys[0])) {
                player.pos = Math.max(0, player.pos - config.paddleSpeed);
            }
            if (state.keysPressed.has(player.keys[1])) {
                player.pos = Math.min(maxPos, player.pos + config.paddleSpeed);
            }
        });

        // Move ball
        state.ball.x += state.ball.speedX;
        state.ball.y += state.ball.speedY;

        // Check collisions
        players.forEach((player, index) => {
            const isVertical = index % 2;
            const pos = isVertical ? 
                { x: index === 1 ? canvas.width : 0, y: player.pos } :
                { x: player.pos, y: index === 0 ? 0 : canvas.height };

            // More precise collision detection for paddle edges
            if (isVertical) {
                // Vertical paddles (left and right)
                if (state.ball.x + config.ballRadius >= pos.x - config.paddleThickness/2 && 
                    state.ball.x - config.ballRadius <= pos.x + config.paddleThickness/2 && 
                    state.ball.y >= pos.y - config.ballRadius && 
                    state.ball.y <= pos.y + config.paddleLength + config.ballRadius) {

                    state.lastHitPlayer = index;
                    state.ball.speed = Math.min(state.ball.speed + config.speedIncrease, config.maxBallSpeed);

                    const relativeHit = (state.ball.y - (pos.y + config.paddleLength/2)) / (config.paddleLength/2);
                    const angle = relativeHit * 0.75 * Math.PI / 4;
                    state.ball.speedY = state.ball.speed * Math.sin(angle);
                    state.ball.speedX = (state.ball.speedX > 0 ? -1 : 1) * state.ball.speed * Math.cos(angle);
                }
            } else {
                // Horizontal paddles (top and bottom)
                if (state.ball.y + config.ballRadius >= pos.y - config.paddleThickness/2 && 
                    state.ball.y - config.ballRadius <= pos.y + config.paddleThickness/2 && 
                    state.ball.x >= pos.x - config.ballRadius && 
                    state.ball.x <= pos.x + config.paddleLength + config.ballRadius) {

                    state.lastHitPlayer = index;
                    state.ball.speed = Math.min(state.ball.speed + config.speedIncrease, config.maxBallSpeed);

                    const relativeHit = (state.ball.x - (pos.x + config.paddleLength/2)) / (config.paddleLength/2);
                    const angle = relativeHit * 0.75 * Math.PI / 4;
                    state.ball.speedX = state.ball.speed * Math.sin(angle);
                    state.ball.speedY = (state.ball.speedY > 0 ? -1 : 1) * state.ball.speed * Math.cos(angle);
                }
            }
        });

        // Check scoring
        if (state.ball.x < 0 || state.ball.x > canvas.width || 
            state.ball.y < 0 || state.ball.y > canvas.height) {
            if (state.lastHitPlayer !== null) {
                players[state.lastHitPlayer].score++;
                if (players[state.lastHitPlayer].score >= config.winningScore) {
                    announceWinner(state.lastHitPlayer);
                    return;
                }
            }
            resetBall();
        }
    }

    function draw() {
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Draw paddles
        players.forEach((player, index) => {
            ctx.strokeStyle = player.color;
            ctx.lineWidth = config.paddleThickness;
            ctx.beginPath();
            if (index % 2 === 0) {
                const y = index === 0 ? config.paddleThickness/2 : canvas.height - config.paddleThickness/2;
                ctx.moveTo(player.pos, y);
                ctx.lineTo(player.pos + config.paddleLength, y);
            } else {
                const x = index === 1 ? canvas.width - config.paddleThickness/2 : config.paddleThickness/2;
                ctx.moveTo(x, player.pos);
                ctx.lineTo(x, player.pos + config.paddleLength);
            }
            ctx.stroke();
        });

        // Draw ball
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.arc(state.ball.x, state.ball.y, config.ballRadius, 0, Math.PI * 2);
        ctx.fill();
    }

    function resetBall() {
        state.ball.x = canvas.width / 2;
        state.ball.y = canvas.height / 2;
        state.ball.speed = config.initialBallSpeed;
        const dir = [{ x: 0, y: -1 }, { x: 1, y: 0 }, { x: 0, y: 1 }, { x: -1, y: 0 }][Math.floor(Math.random() * 4)];
        state.ball.speedX = dir.x * state.ball.speed;
        state.ball.speedY = dir.y * state.ball.speed;
        state.lastHitPlayer = null;
    }

    function announceWinner(winnerIndex) {
        state.gameActive = false;
        const announcement = document.createElement('div');
        announcement.className = 'position-absolute top-50 start-50 translate-middle text-white text-center';
        announcement.style.cssText = `font-size: 2rem; z-index: 1000; color: ${players[winnerIndex].color}`;
        announcement.textContent = `Player ${winnerIndex + 1} Wins!`;
        gameContainer.appendChild(announcement);

        // Redirect to homepage after 3 seconds
        setTimeout(() => {
            document.getElementById('pong-page').remove();
            document.getElementById('main-page').classList.add('active-page');
        }, 3000);
    }

    // Update scores in the UI
    function updateScores() {
        players.forEach((player, i) => {
            const scoreElement = document.getElementById(`player${i}Score`);
            if (scoreElement) {
                scoreElement.textContent = player.score;
            }
        });
    }

    // Modify the update function to call updateScores
    const originalUpdate = update;
    update = function() {
        originalUpdate();
        updateScores();
    };

    // Start game loop
    function gameLoop() {
        update();
        draw();
        requestAnimationFrame(gameLoop);
    }
    gameLoop();

    // Start game with countdown
    announceGame();
}

// Initialize when script loads
document.addEventListener('DOMContentLoaded', initGame);