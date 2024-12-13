import { getState, updateState } from "../stateManager.js"

export function GameView() {
  const section = document.createElement("section");
  section.id = "game-view";
  const container = document.createElement("div");
  container.className = "game-container";


  // Player detail sections for each player
  const playerLeft = document.createElement("div");
  playerLeft.className = "player-info left";
  playerLeft.id = "playerLeft";

  const playerTop = document.createElement("div");
  playerTop.className = "player-info top";
  playerTop.id = "playerTop";

  const playerBottom = document.createElement("div");
  playerBottom.className = "player-info bottom";
  playerBottom.id = "playerBottom";

  const playerRight = document.createElement("div");
  playerRight.className = "player-info right";
  playerRight.id = "playerRight";

  // Canvas container
  const canvasContainer = document.createElement("div");
  canvasContainer.className = "canvas-container";

  const canvas = document.createElement("canvas");
  canvas.id = "gameCanvas";
  resizeCanvas(canvas);
  canvasContainer.appendChild(canvas);

  // Append player info sections and canvas to the main container
  container.appendChild(playerLeft);
  container.appendChild(playerTop);
  container.appendChild(canvasContainer);
  container.appendChild(playerBottom);
  container.appendChild(playerRight);
  section.appendChild(container);

  // Check for player names in the state and start the game
  const state = getState();
  const playerNames = state.players;
  if (!playerNames || playerNames.length === 0) {
    window.location.hash = "#select_pong";
    return;
  }
  return section;
}


export function resizeCanvas(canvas) 
{
  const ctx = canvas.getContext("2d");

  if (window.innerWidth > 1000)
  {
    canvas.width = 800;
    canvas.height = 600;
    updateState({ canvasSize: "L" });

  }
  else if (window.innerWidth > 600) {
    // Medium Canvas
    canvas.width = 600;
    canvas.height = 450;
    updateState({ canvasSize: "M" });
  } 
  else if (window.innerWidth > 390) {
    // Small Canvas
    canvas.width = 350;
    canvas.height = 300;
    updateState({ canvasSize: "S" });
  } 
  else
  {
    canvas.width = 300;
    canvas.height = 200;
    updateState({ canvasSize: "XS" });
  }
}

