import { drawBackground, usleep } from "./GameUtils.js";
import { updateState, getState } from "../stateManager.js";
import { showAlert } from "../main.js";

export function startGame(resolve)
{
  const {winner, gameLoopID, gameOver, playerObjects, ball, canvas, ctx} = getState().pongGame;

  if (gameOver)
  {
    cancelAnimationFrame(gameLoopID);
    resolve(winner);
    return;
  }
  if (!canvas || !ctx || getState().isCancelled)
  {
    resolve();
    showAlert("Game cancelled", "info", 2000);
    return;
  }
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawBackground(ctx, canvas);

  ball.draw();
  playerObjects.forEach((player) => {
    player.draw();
    player.update();
  });

  ball.wallCollision();
  ball.update();
  updateState({pongGame: { gameLoopID: requestAnimationFrame(() => startGame(resolve)) }});
}

export function displayScores(playerObjects) {
  playerObjects.forEach((player, index) => {
    let playerDiv;
    switch (index) {
      case 0:
        playerDiv = document.getElementById("playerLeft");
        break;
      case 1:
        playerDiv = document.getElementById("playerRight");
        break;
      case 2:
        playerDiv = document.getElementById("playerTop");
        break;
      case 3:
        playerDiv = document.getElementById("playerBottom");
        break;
    }
    if (playerDiv)
      playerDiv.textContent = `${player.name}: ${player.score}`;
  });
}


