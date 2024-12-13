// routes.js

import { Home } from "./views/Home.js";
import { TournamentView } from "./views/TournamentView.js";
import { SelectPong } from "./views/SelectPong.js";
import { FormView } from "./views/FormView.js";
import { NotFound } from "./views/NotFound.js";
import { MultiPong } from "./views/MultiPong.js";
import { GameView } from "./views/GameView.js";
import { createBracket } from "./game/Tournament.js";
import { AboutView } from "./views/AboutView.js";
import { LoginView } from "./views/LoginView.js";
import { RegisterView } from "./views/RegisterView.js";
import { initNavBar, validateForm } from "./main.js";
import { ProfileView } from "./views/ProfileView.js";
import { NavBar } from "./components/NavBar.js";
import { handleLanguageChange } from "./lang.js";
import { gameMode } from "./game/PongGame.js";
import { GameMode } from "./views/GameMode.js";
import { getState, resetState, updateState } from "./stateManager.js";
import { QRView } from "./views/QRView.js";
import { fetchAndRenderTournaments, handle42Redirect } from "./auth/auth.js";
import { HistoryView } from "./views/HistoryView.js";


const routes = {
  "#home": Home,
  "#": Home,
  "#form": FormView,
  "#select_pong": SelectPong,
  "#multi_pong": MultiPong,
  "#game": GameView,
  "#gameMode": GameMode,
  "#logout": Home,
  "#about": AboutView,
  "#login": LoginView,
  "#register": RegisterView,
  "#profile": ProfileView,
  "#qr": QRView,
  "#404": NotFound,
  "#history": HistoryView,
  default: NotFound,
};

function sanitizePath(path)
{
  const allowedRoutes = Object.keys(routes).concat(["#tournament"]);
  return allowedRoutes.includes(path) ? path : "#404";
}

export function handleLocation()
{
  if (window.location.hash.startsWith("#42ad"))
  {
    handle42Redirect();
    return;
  }
  const path = sanitizePath(window.location.hash || "#home");
  updateState({isCancelled: true});
  const app = document.getElementById("app");

  app.innerHTML = "";

  if (path != "#tournament" && path != "#game") resetState();

  const isLoggedIn = localStorage.getItem("isLoggedIn") === "true";
  
  if (isLoggedIn && (path === "#login" || path === "#register")) {
      window.location.hash = "#profile";
    return;
  }
  
  const protectedRoutes = ["#profile", "#tournament", "#history", "#qr"];
  if (!isLoggedIn && protectedRoutes.includes(path)) {
    window.location.hash = "#login";
    return;
  }
  app.appendChild(NavBar());
  initNavBar();
  let view = null;
  switch (path) {
    case "#tournament":
      view = TournamentView();
      if (view) app.appendChild(view);
      createBracket();
      break;
    case "#game":
      view = GameView();
      if (view) app.appendChild(view);
      gameMode(getState().players, document.getElementById("gameCanvas"));
      break
    case "#login":
      view = LoginView();
      if (view) app.appendChild(view);
      validateForm();
      break;
    case "#register":
      view = RegisterView();
      if (view) app.appendChild(view);
      validateForm();
      break;
    case "#history":
      view = HistoryView();
      if (view) app.appendChild(view);
      fetchAndRenderTournaments(view);
      break;
    default:
      view = routes[path]() || NotFound();
      if (view) app.appendChild(view);
  }

  const language = localStorage.getItem("language") || "en";
  handleLanguageChange(language);
}

export function navigateTo(hash)
{
  window.location.hash = hash;
}