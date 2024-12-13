// app.js
import { setupGlobalHandlers, showAlert } from "./main.js";
import { handleLocation, navigateTo } from "./routes.js";
import { getState } from "./stateManager.js";

async function initApp() {
  const appElement = document.getElementById("app");
  showAlert("Welcome to the Pong Game!", "success", 1000);
  setupGlobalHandlers();
  // Check if appElement exists
  if (!appElement) 
  {
    return;
  }
  const user = localStorage.getItem("user");
  if (!user)
    localStorage.setItem("isLoggedIn", false);
  handleLocation();
}

function handleResize() {
  const width = window.innerWidth;
  const { canvasSize } = getState();

  // Conditions for resizing
  const isLargeScreen = canvasSize === "L" && width <= 1000;
  const isMediumScreen = canvasSize === "M" && (width <= 600 || width > 930);
  const isSmallScreen = canvasSize === "S" && width > 390 && width <= 600;
  const isXSmallScreen = canvasSize === "XS" && width <= 390;

  if (
    (isLargeScreen || isMediumScreen || isSmallScreen || isXSmallScreen) &&
    (window.location.hash === "#game" || window.location.hash === "#tournament")
  ) {
    navigateTo("#select_pong");
  }
}

// Listen for changes in the hash (route changes)
window.addEventListener("hashchange", handleLocation);
window.addEventListener("load", initApp);
window.addEventListener('resize', handleResize);
