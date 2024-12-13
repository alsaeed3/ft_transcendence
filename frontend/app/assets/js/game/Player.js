import { settings } from "./settings.js";

export class Player {
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
    ctx,
    isAI = false
  ) {
    this.name = name;
    this.paddleX = paddleX;
    this.paddleY = paddleY;
    this.paddleWidth = paddleWidth;
    this.paddleHeight = paddleHeight;
    this.movementAxis = movementAxis;
    this.upKey = upKey;
    this.downKey = downKey;
    this.canvas = canvas;
    this.ctx = ctx;
    this.speed = settings.playerSpeed;
    this.upPressed = false;
    this.downPressed = false;
    this.score = 0;
    this.paddleHits = 0;
    this.isAI = isAI;
  }

  reset()
  {
    this.score = 0;
    this.paddleHits = 0;
  }

  draw()
  {
    this.ctx.beginPath();
    this.ctx.rect(
      this.paddleX,
      this.paddleY,
      this.paddleWidth,
      this.paddleHeight
    );
    this.ctx.fillStyle = "white";
    this.ctx.shadowColor = "rgba(0, 0, 0, 0.5)";
    this.ctx.shadowBlur = 10;
    this.ctx.fill();
    this.ctx.closePath();
    this.ctx.shadowBlur = 0;
  }

  update()
  {
    if (this.movementAxis === "vertical")
    {
      if (this.upPressed && this.paddleY > 0) 
        this.paddleY -= this.speed;
      if (this.downPressed && this.paddleY < this.canvas.height - this.paddleHeight)
        this.paddleY += this.speed;
    }
    else 
    {
      if (this.upPressed && this.paddleX > 0)
        this.paddleX -= this.speed;
      if (this.downPressed && this.paddleX < this.canvas.width - this.paddleWidth)
        this.paddleX += this.speed;
    }
  }

  checkCollision(ball)
  {
    if (this.movementAxis === "vertical") {
      if (
        ball.x - ball.radius < this.paddleX + this.paddleWidth && // Ball hits paddle's right side
        ball.x + ball.radius > this.paddleX &&                    // Ball hits paddle's left side
        ball.y + ball.radius > this.paddleY &&                    // Ball hits paddle's top
        ball.y - ball.radius < this.paddleY + this.paddleHeight    // Ball hits paddle's bottom
    ) {
        // Ball collided with the paddle, now check which side
        const ballCenterY = ball.y;
        const paddleCenterY = this.paddleY + this.paddleHeight / 2;
    
        // Adjust bounce angle based on where the ball hit the paddle (higher or lower)
        const hitPosition = (ballCenterY - paddleCenterY) / (this.paddleHeight / 2);
        
        ball.dx = -ball.dx;
        ball.dy += hitPosition * 2;
    
        this.paddleHits++;
        if (this.paddleHits >= settings.hitLimit) {
            ball.increaseSpeed(); 
            this.paddleHits = 0; 
        }
    }
    
    }
    else if (
      ball.y - ball.radius < this.paddleY + this.paddleHeight &&  // Ball hits bottom of the paddle
      ball.y + ball.radius > this.paddleY &&                     // Ball hits top of the paddle
      ball.x + ball.radius > this.paddleX &&                     // Ball hits left side
      ball.x - ball.radius < this.paddleX + this.paddleWidth      // Ball hits right side
      )
    {
        // Ball collided with the paddle, now check which side
        const ballCenterX = ball.x;
        const paddleCenterX = this.paddleX + this.paddleWidth / 2;
    
        // Adjust bounce angle based on where the ball hit the paddle (left or right)
        const hitPosition = (ballCenterX - paddleCenterX) / (this.paddleWidth / 2);
    
        ball.dy = -ball.dy;  // Reverse ball direction on Y-axis
        ball.dx += hitPosition * 2;  // Adjust the ball's X direction based on where it hit
    
        this.paddleHits++;
        if (this.paddleHits >= settings.hitLimit)
        {
            ball.increaseSpeed();  // Increase the speed of the ball after 3 hits
            this.paddleHits = 0;  // Reset hit count
        }
    }
  }
}
