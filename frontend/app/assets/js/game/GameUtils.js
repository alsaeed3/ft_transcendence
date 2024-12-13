import { getState, updateState } from "../stateManager.js";
import { displayScores } from "./GameLogic.js";
import { startGameWithCountdownAndPromise } from "./PongGame.js";

export function usleep(seconds) {
  return new Promise(resolve =>
    {
      const {canvas } = getState().pongGame;
      if (!canvas)
        resolve(null);
      canvas.style.cursor = "wait";
      setTimeout(()=>{ resolve();}, seconds * 1000);
    }) 
}

function getNestedValue(obj, key)
{
  return key.split('.').reduce((currentObject, keyPart) => {
      return currentObject ? currentObject[keyPart] : undefined;
  }, obj);
}

export function translateValue(value)
{
  const { language } = getState();
  const translation = language[localStorage.getItem("language")];
  const data = getNestedValue(translation, value) || value;
  return data;
}

export function drawBackground(ctx, canvas) {
  const {width, height} = canvas;
  const gradient = ctx.createRadialGradient(
    width / 2,
    height / 2,
    height / 4,
    width / 2,
    height / 2,
    height
  );
  gradient.addColorStop(0, "#2a2a2a");
  gradient.addColorStop(1, "#4c4c4c");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  // Draw dotted middle line
  ctx.setLineDash([10, 10]);
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(width / 2, 0);
  ctx.lineTo(width / 2, height);
  ctx.stroke();
  ctx.setLineDash([]);
}

export function keyHandler(e, isPressed, playerObjects) {
  playerObjects.forEach((player) => {
    if (e.key === player.upKey && !player.isAI) player.upPressed = isPressed;
    if (e.key === player.downKey && !player.isAI) player.downPressed = isPressed;
  });
}

export function checkForWinner() {
  const { playerObjects, winningScore } = getState().pongGame;
  displayScores(playerObjects);
  playerObjects.forEach((player) => {
    if (player.score >= winningScore){
      displayWinner(player.name);
    }
  });
}

function handleGameRestart() {
  const { playerObjects, ball } = getState().pongGame;
  playerObjects.forEach((player) => player.reset());
  ball.reset();
  updateState({ pongGame: { gameOver: false } });
  startGameWithCountdownAndPromise();
}

async function displayWinner(winner)
{
  const { ctx, canvas, playerObjects, fontSize } = getState().pongGame;
  const { width, height } = canvas;
  ctx.clearRect(0, 0, width, height);
  ctx.font = fontSize;
  ctx.fillStyle = "white";
  ctx.textAlign = "center";

  if (playerObjects.length < 3) 
  {
    const text = translateValue("game.winner.single");
    ctx.fillText(`${winner} ${text}`, width / 2, height / 2); // Add data-i18n attribute for localization
    ctx.canvas.setAttribute("data-i18n", "game.winner.single");
  } 
  else
  {
    const text = translateValue("game.winner.lose");
    ctx.fillText(`${winner} ${text}`, width / 2, height / 2); // Add data-i18n attribute for localization
    ctx.canvas.setAttribute("data-i18n", "game.winner.lose");
  }
  if (!getState().tournament)
  {
    const text = translateValue("game.restartMessage");
    ctx.fillText(text, width / 2, height / 2 + 50); // Add data-i18n attribute for localization
    ctx.canvas.setAttribute("data-i18n", "game.restartMessage");
    canvas.addEventListener("click", handleGameRestart, { once: true });
  }
  updateState({ pongGame: { gameOver: true, winner: winner } });
}

export function startCountdownWithDetails() {
  const { ctx, canvas, playerObjects, fontSize } = getState().pongGame;
  return new Promise((resolve) => {
    if (!canvas || !ctx)
      resolve();
    const { width, height } = canvas;
    let countdown = 2;
    const countdownInterval = setInterval(() => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      ctx.font = fontSize;
      ctx.fillStyle = "white";
      ctx.textAlign = "center";

      playerObjects.forEach((player) => {
        const playerFontSize = fontSize * 0.8; // Font size for player name
        const controlsFontSize = fontSize * 0.7; // Font size for control keys

        ctx.font = `${playerFontSize}px Arial`;

        // Add localization attributes to player name and controls
        if (player.movementAxis === "vertical") {
          if (player.paddleX === 0) {
            ctx.canvas.setAttribute("data-i18n", "game.leftPaddle");
            ctx.font = `${controlsFontSize}px Arial`;
            ctx.fillText(`(W / S)`, 50, height / 2);
            ctx.canvas.setAttribute("data-i18n", "game.controls.leftPaddle");
          } else {
            ctx.canvas.setAttribute("data-i18n", "game.rightPaddle");
            ctx.font = `${controlsFontSize}px Arial`;
            ctx.fillText(`(↑ / ↓)`, width - 70, height / 2);
            ctx.canvas.setAttribute("data-i18n", "game.controls.rightPaddle");
          }
        } else {
          if (player.paddleY === 0) {
            ctx.canvas.setAttribute("data-i18n", "game.topPaddle");
            ctx.font = `${controlsFontSize}px Arial`;
            ctx.fillText(`(Z / X)`, width / 2, 80);
            ctx.canvas.setAttribute("data-i18n", "game.controls.topPaddle");
          } else {
            ctx.canvas.setAttribute("data-i18n", "game.bottomPaddle");
            ctx.font = `${controlsFontSize}px Arial`;
            ctx.fillText(`(, / .)`, width / 2, height - 30);
            ctx.canvas.setAttribute("data-i18n", "game.controls.bottomPaddle");
          }
        }
      });

      const text = translateValue("game.countdown");
      ctx.font = fontSize;
      ctx.fillStyle = "white";
      ctx.fillText(`${text} ${countdown}...`, width / 2, height / 2);
      ctx.canvas.setAttribute("data-i18n", "game.countdown");

      countdown--;
      if (countdown < 0) {
        clearInterval(countdownInterval);
        resolve();
      }
    }, 1000);
  });
}
