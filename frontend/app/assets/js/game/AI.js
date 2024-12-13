import { getState } from "../stateManager.js";
import { Player } from "./Player.js";
import { settings } from "./settings.js";

export class AI extends Player
{
	constructor(
		name,
		paddleX,
		paddleY,
		paddleWidth,
		paddleHeight,
		movementAxis,
		upKey,
		downKey,
		canvas,
		ctx
	  )
	{
		super(
			name,
			paddleX,
			paddleY,
			paddleWidth,
			paddleHeight,
			movementAxis,
			upKey,
			downKey,
			canvas,
			ctx,
			true
		  )
		this.lastUpdate = null;
		this.lastKnownBallY = 0;
		this.aiSpeedFactor = settings.aiSpeedFactor;
		this.aiTolerance = settings.aiTolerance;
	}
	predictBallPosition(ball)
	{
		const now = Date.now();

		if (!this.lastUpdate || now - this.lastUpdate > 1000) 
		{
			let predictedY = 0;
			if (ball.dx > 0) 
			{
				predictedY = ball.y + (this.canvas.width - ball.x - this.paddleWidth) * (ball.dy / ball.dx);

				// Bounce prediction: reflect off top/bottom walls
				while (predictedY < 0 || predictedY > this.canvas.height) 
				{
					if (predictedY < 0) 
						predictedY = -predictedY;
					else if (predictedY > this.canvas.height) 
						predictedY = this.canvas.height - (predictedY - this.canvas.height);
				}
			}
			else // Away
				predictedY = ball.y + Math.random() * 2;

			this.lastKnownBallY = predictedY;
			this.lastUpdate = now;

		}
		return this.lastKnownBallY;
	}
	update()
	{
		const { ball, playerObjects } = getState().pongGame;
		this.setAIParameters(ball, playerObjects[0]);
		this.lastKnownBallY = this.predictBallPosition(ball);
		if (this.paddleY + this.paddleHeight / 2 < this.lastKnownBallY - this.aiTolerance) {
			this.paddleY += this.speed * this.aiSpeedFactor + Math.random() * 2; // Move AI down slower
		} else if (this.paddleY + this.paddleHeight / 2 > this.lastKnownBallY + this.aiTolerance) {
			this.paddleY -= this.speed * this.aiSpeedFactor + Math.random() * 2; // Move AI up slower
		}

		// Within the canvas bounds
		if (this.paddleY < 0) 
			this.paddleY = 0;
		if (this.paddleY + this.paddleHeight > this.canvas.height)
			this.paddleY = this.canvas.height - this.paddleHeight;
	}
	setAIParameters(ball, player) 
	{
	if (ball.dx > 0) // Ball moving towards AI
	{
		// When the ball is moving towards the AI, make the AI a bit more precise but still unpredictable
		this.aiTolerance = Math.random() * 25 + 25; // Smaller random tolerance (25 to 50)
		this.aiSpeedFactor = Math.random() * 0.3 + 0.7; // Faster (70% to 100% speed)
	}
	else // Ball moving away from AI
	{
		// When the ball is moving away, AI relaxes more and moves slower
		this.aiTolerance = Math.random() * 50 + 50; // Larger random tolerance (50 to 100)
		this.aiSpeedFactor = Math.random() * 0.5 + 0.5; // Slower (50% to 100% speed)
	}
	const scoreDifference = this.score - player.score; // Score difference between AI and player

	// Ball speed calculation
	const ballSpeed = Math.abs(ball.dx) + Math.abs(ball.dy); // Ball speed

	// Score-based ratio: reduce AI speed and increase tolerance if player is losing badly
	let scoreRatio = 1; // Default ratio (no adjustment)
	if (scoreDifference >= 3) // If AI is leading
		scoreRatio = Math.min(1 + scoreDifference * 0.2, 2); // Cap ratio increase (max 2x tolerance, min 0.5x speed)

	// Ball speed ratio: reduce AI speed and increase tolerance as ball speed increases
	let speedRatio = 1; // Default ratio (no adjustment)
	if (ballSpeed > settings.speedLimit && player.paddleHits % settings.hitLimit == 0) // If ball speed is high (e.g., 8 pixels/frame) and player has hit the ball 3 times
		speedRatio = Math.min(1 + (ballSpeed - 10) * 0.1, 1.5); // Increase tolerance (max 1.5x) as ball speed increases
	this.aiTolerance *= scoreRatio * speedRatio;
	this.aiSpeedFactor /= scoreRatio * speedRatio;
	}
}