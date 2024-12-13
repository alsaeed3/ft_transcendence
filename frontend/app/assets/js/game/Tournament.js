import { getState, updateState } from "../stateManager.js";
import { startPongGame } from "./PongGame.js";
import { translateValue } from "./GameUtils.js";
import { navigateTo } from "../routes.js";
import { handleTournamentData } from "../auth/auth.js";

async function postWinner(winner)
{
    const username = JSON.parse(localStorage.getItem("user")).username;
    const data = {
        "creator_name": username,
        "winner_nickname": winner,
        "participants_names": getState().players
    };
    await handleTournamentData(data);
}

async function displayWinner(winner) 
{

    await postWinner(winner);
    let text = translateValue("game.winnerMessage");
    document.querySelector('.tournament-bracket').innerHTML = `
        <div id="winnerDisplay" data-i18n="game.winnerDisplay">
            <h1 data-i18n="game.winnerMessage">🏆 ${winner} ${text}</h1>
        </div>
    `;
    const { canvas, ctx, fontSize} = getState().pongGame;
    const { width, height } = canvas;
    ctx.clearRect(0, 0, width, height);

    ctx.font = fontSize;
    ctx.fillStyle = "white";
    ctx.textAlign = "center";
    text = translateValue("game.restartMessage");
    ctx.fillText(text, width / 2, height / 2 + 50);
    ctx.canvas.setAttribute("data-i18n", "game.restartMessage");
    
    canvas.addEventListener(
        "click",
            createBracket,
        { once: true }
    );
}

function shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]]; // Swap elements
    }
    return array;
}

function markLoser(player) {
    const playerElement = document.querySelector(`#player-${player}`);
    if (playerElement) {
        playerElement.style.textDecoration = 'line-through';
        playerElement.style.textDecorationColor = 'red';
    }
}

function drawBrackets(players) {
    let roundName;

    // Determine the current round based on the number of players left
    if (players.length === 8)
        roundName = translateValue('game.roundName.quarterFinals');
    else if (players.length === 4)
        roundName = translateValue('game.roundName.semiFinals');
    else if (players.length === 2)
        roundName = translateValue('game.roundName.final');
    // Begin rendering the brackets
    let html = `<div class="bracket"><h3>${roundName}</h3>`;

    // Loop through players and create match brackets
    players.forEach((player, index) => {
        let text = translateValue('game.matchNumber');
        if (index % 2 === 0) {
            html += `<div class="match"><h3>${text} ${Math.ceil((index + 1) / 2)}</h3>`;
        }
        html += `<p class="player" id="player-${player}">${player}</p>`;
        if (index % 2 !== 0) {
            html += `</div>`;  // Close match div after 2 players
        }
    });

    html += '</div>';

    // Inject the HTML into the tournament bracket container
    document.querySelector('.tournament-bracket').innerHTML = html;
}

export async function createBracket() {
    const { players } = getState();
    updateState({ isCancelled: false });
    const cnv = document.querySelector('#gameCanvas');
    if (!players || players.length !== 8) {
        navigateTo("#select_pong");
        return;
    }

    // Shuffle players to randomize matchups
    const shuffledPlayers = shuffle([...players]);

    // Keep progressing until we have a final winner
    while (shuffledPlayers.length > 1 && !getState().isCancelled)
    {
        // Display the current bracket before each round
        drawBrackets(shuffledPlayers);
        for (let i = 0; i < shuffledPlayers.length; i++) {
            const winner = await startPongGame([shuffledPlayers[i], shuffledPlayers[i + 1]], cnv);
            if (!winner) return;
            // Remove the loser from the array, keep the winner for the next round
            if (winner === shuffledPlayers[i])
            {
                markLoser(shuffledPlayers[i + 1]);  // Update the UI to show loser
                shuffledPlayers.splice(i + 1, 1);   // Remove loser
            }
            else
            {
                markLoser(shuffledPlayers[i]);      // Update the UI to show loser
                shuffledPlayers.splice(i, 1);       // Remove loser
            }
        }
    }
    // After all rounds, the remaining player is the champion
    displayWinner(shuffledPlayers[0]);
}
