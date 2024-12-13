import { Ball } from "./Ball.js";
import { Player } from "./Player.js";
import { keyHandler, startCountdownWithDetails, translateValue, usleep } from "./GameUtils.js";
import { getState, resetGameState, updateState } from "../stateManager.js";
import { displayScores, startGame } from "./GameLogic.js";
import { AI } from "./AI.js";
import { updateSettings, settings } from "./settings.js";
import { enableTouchControlsForMobile } from "../main.js";

export async function gameMode(playerNames, canvas)
{
  try
  {
    updateState({ isCancelled: false });
    if (getState().gameModeFlag)
    {
      updateState({ gameModeFlag: false, tournament: true});
      while (playerNames.length > 1 && !getState().isCancelled)
      {
        const winner = await startPongGame(playerNames, canvas);
        const bottomPlayer = document.querySelector(".player-info.bottom");
        const topPlayer = document.querySelector(".player-info.top");
        if (bottomPlayer)
          bottomPlayer.textContent = "";
        if (topPlayer && playerNames.length != 4)
          topPlayer.textContent = "";
          if (playerNames.length === 2)
          {
            const text = translateValue("game.restartMessage");
            const { ctx } = getState().pongGame;
            if (!ctx)
              return;
            const { width, height } = canvas;
            ctx.fillText(text, width / 2, height / 2 + 50); // Add data-i18n attribute for localization
            ctx.canvas.setAttribute("data-i18n", "game.restartMessage");
            updateState({gameModeFlag: true});
            canvas.addEventListener("click", ()=>{ gameMode(getState().players, canvas) }, { once: true });
          }
          playerNames = playerNames.filter((name) => name !== winner);
      }
    }
    else
    {
      await startPongGame(playerNames, canvas);
    }
  }
  catch (e)
  {
    return null;
  }
}
export async function startPongGame(playerNames, canvas)
{
  resetGameState();
  updateSettings();
  if (!canvas)
    return null;
  const { ballSpeed, ballRadius, speedMultiplier } = settings;
  const { width, height } = canvas;
  const ctx = canvas.getContext("2d");
  const ball = new Ball(
    width / 2,
    height / 2,
    ballRadius,
    ballSpeed,
    ballSpeed,
    canvas,
    ctx,
    speedMultiplier
  );

  const playerObjects = createPlayers(playerNames, canvas, ctx);
  document.addEventListener("keydown", (e) =>
  keyHandler(e, true, playerObjects)
  );
  document.addEventListener("keyup", (e) =>
  keyHandler(e, false, playerObjects)
  );

  enableTouchControlsForMobile(playerObjects);
  updateState(
    {
      pongGame:
      {
        canvas,
        ctx,
        ball,
        winningScore: settings.winningScore,
        playerObjects,
        gameOver: false,
      }
    }
  );
  const winner  = await startGameWithCountdownAndPromise();
  return winner;
}

export async function startGameWithCountdownAndPromise() {
  const { canvas } = getState().pongGame;
  if (!canvas)
    resolve(null);
  const { playerObjects } = getState().pongGame;
  await usleep(2);
  displayScores(playerObjects);
  await startCountdownWithDetails();
  canvas.style.cursor = "auto";
  return new Promise((resolve) => {
    startGame(resolve);
  });
}

function createPlayers(playerNames, canvas, ctx)
{
  const { paddleWidth, paddleHeight } = settings;
  let playerObjects = [];

  playerObjects.push(
    new Player(
      playerNames[0],
      0,
      (canvas.height - 100) / 2,
      paddleWidth,
      paddleHeight,
      "vertical",
      "w",
      "s",
      canvas,
      ctx
    )
  );
  if (playerNames.length === 1)
  {
    playerObjects.push(
      new AI(
        "AI",
        canvas.width - 10,
        (canvas.height - 100) / 2,
        paddleWidth,
        paddleHeight,
        "vertical",
        "ArrowUp",
        "ArrowDown",
        canvas,
        ctx
      )
    );
    if (playerObjects[0].name === "AI")
        playerObjects[0].name = "AI (Player)";
  }
  if (playerNames.length >= 2) {
    playerObjects.push(
      new Player(
        playerNames[1],
        canvas.width - 10,
        (canvas.height - 100) / 2,
        paddleWidth,
        paddleHeight,
        "vertical",
        "ArrowUp",
        "ArrowDown",
        canvas,
        ctx
      )
    );
  }

  if (playerNames.length >= 3) {
    playerObjects.push(
      new Player(
        playerNames[2],
        (canvas.width - 100) / 2,
        0,
        paddleHeight,
        paddleWidth,
        "horizontal",
        "z",
        "x",
        canvas,
        ctx
      )
    );
  }

  if (playerNames.length === 4) {
    playerObjects.push(
      new Player(
        playerNames[3],
        (canvas.width - 100) / 2,
        canvas.height - 10,
        paddleHeight,
        paddleWidth,
        "horizontal",
        ",",
        ".",
        canvas,
        ctx
      )
    );
  }

  return playerObjects;
}
