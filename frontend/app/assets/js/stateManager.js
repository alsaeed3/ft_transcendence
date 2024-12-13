const state = {
  playerCount: 0, // General data
  players: [],
  tournament: false,
  gameModeFlag: false,
  isCancelled: false,
  canvasSize: "L",
  language:
  {
    eg: {},
    ar: {},
    de: {},
  },
  // Game-related data under the 'game' object
  pongGame: {
    playerObjects: [],
    ball: null,
    gameOver: false,
    gameLoopID: null,
    canvas: null,
    ctx: null,
    fontSize: "18px Arial",
  }
};

export function getState() {
    return state;
}

export function updateState(newState) {
  // Merge only at the top level
  Object.keys(newState).forEach((key) => {
    if (typeof newState[key] === 'object' && !Array.isArray(newState[key]) && newState[key] !== null) {
      state[key] = { ...state[key], ...newState[key] }; // Deep merge for objects
    } else {
      state[key] = newState[key];
    }
  });
}
export function setPlayerNames(names) {
  state.players = names;
}

export function resetGameState() {
  // Resetting only the game-related data
  state.pongGame = {
    playerObjects: [],
    ball: null,
    gameOver: false,
    gameLoopID: null,
    canvas: null,
    ctx: null,
    fontSize: "18px Arial",
  };
}

export function resetState()
{
  resetGameState();
  state.players = [];
  state.tournament = false;
}