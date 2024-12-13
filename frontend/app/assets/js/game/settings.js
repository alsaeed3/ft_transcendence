import { getState } from "../stateManager.js";

export const settings = {
	winningScore: 4,
	fontSize: "18px Arial",
	// Ball and paddle settings
	ballSpeed: 5,
	ballRadius: 10,
	paddleHeight: 100,
	paddleWidth: 10,
	playerSpeed: 5,
	speedMultiplier: 1.1,
	hitLimit: 3,
	speedLimit: 5,

	// AI settings
	aiSpeedFactor:  0.7,
	aiTolerance: 50,
}

export function updateSettings() 
{
	const { canvasSize } = getState();
	if (canvasSize === "XS") {
		settings.ballSpeed = 2.5;            // Slowest speed for very small space
		settings.ballRadius = 5;           // Small ball radius
		settings.paddleWidth = 5;          // Narrow paddle
		settings.paddleHeight = 50;        // Shorter paddle
		settings.playerSpeed = 2.5;        // Reduced player speed for better control
		settings.aiSpeedFactor = 0.3;      // Slow AI movement
		settings.aiTolerance = 15;         // Very small tolerance for precise play
		settings.speedMultiplier = 1.02;   // Minimal speed increment
		settings.speedLimit = 2.5;         // Lowest speed limit
		settings.hitLimit = 3;             // Hit limit remains the same
	  }
	else if (canvasSize === "S") 
	{
		settings.ballSpeed = 3.5;         // Lower speed for more control in smaller space
		settings.ballRadius = 6.5;          // Smaller ball radius to fit smaller area
		settings.paddleWidth = 6;         // Slightly narrower paddle
		settings.paddleHeight = 60;       // Smaller paddle for smaller space
		settings.playerSpeed = 3;         // Reduced player speed for better control
		settings.aiSpeedFactor = 0.4;     // Slower AI movement to adjust to smaller paddles
		settings.aiTolerance = 20;        // Smaller tolerance for smaller screen size
		settings.speedMultiplier = 1.03;  // Slightly slower speed increase
		settings.speedLimit = 3;          // Lower speed limit for smaller space
		settings.hitLimit = 3;
	}
	else if (canvasSize === "M")
	{
		settings.ballSpeed = 4.5;         // Adjust for medium size
		settings.ballRadius = 8;          // Slightly smaller than large canvas
		settings.paddleWidth = 8;
		settings.paddleHeight = 80;
		settings.playerSpeed = 4;         // Balance between small and large settings
		settings.aiSpeedFactor = 0.6;
		settings.aiTolerance = 35;
		settings.speedMultiplier = 1.06;
		settings.speedLimit = 4;
		settings.hitLimit = 3;
	}
	else
	{
		settings.fontSize = "18px Arial";
		// Ball and paddle settings
		settings.ballSpeed = 5;
		settings.ballRadius = 10;
		settings.paddleHeight = 100;
		settings.paddleWidth = 10;
		settings.playerSpeed = 5;
		settings.speedMultiplier = 1.1;
		settings.hitLimit = 3;
		settings.speedLimit = 5;
	
		// AI settings
		settings.aiSpeedFactor =  0.7;
		settings.aiTolerance = 50;
	}
}
