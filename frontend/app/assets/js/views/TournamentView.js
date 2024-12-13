import { getState, updateState } from '../stateManager.js';
import { resizeCanvas } from './GameView.js';

export function TournamentView() {
    const { players } = getState();

    if (!players || players.length !== 8) return;
    const section = document.createElement("section");
    section.id = "tournament-view";
    const gameContainer = document.createElement("div");
    gameContainer.className = "game-container";
    section.appendChild(gameContainer);


    // Create the tournament bracket container    
    const bracketContainer = document.createElement("div");
    bracketContainer.className = "tournament-bracket";
    gameContainer.appendChild(bracketContainer);

    const canvasContainer = document.createElement("div");
    canvasContainer.className = "canvas-container";
    gameContainer.appendChild(canvasContainer);

    // Player detail sections for each player
    const playerLeft = document.createElement("div");
    playerLeft.className = "player-info left";
    playerLeft.id = "playerLeft";
    canvasContainer.appendChild(playerLeft);
  
    const canvas = document.createElement("canvas");
    canvas.id = "gameCanvas";
    resizeCanvas(canvas);
    canvasContainer.appendChild(canvas);

    const playerRight = document.createElement("div");
    playerRight.className = "player-info right";
    playerRight.id = "playerRight";
    canvasContainer.appendChild(playerRight);


    if (!players || players.length !== 8)
    {
        const alertDiv = document.createElement('div');
        alertDiv.className = 'alert alert-danger';
        alertDiv.setAttribute("data-i18n", "tournament.error"); // i18n for the error message
        alertDiv.textContent = 'Exactly 8 players are required for the tournament.';
        section.appendChild(alertDiv);
        return section;
    }
    updateState({tournament: true});
    return section;
}
