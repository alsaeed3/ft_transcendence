import { navigateTo } from "../routes.js"; // Assuming a simple navigate function
import { updateState } from "../stateManager.js"; // Your custom state manager

export function GameMode() {
  const container = document.createElement("section");
  container.id = "featured-services";
  container.className = "featured-services section";

  container.innerHTML = `
    <div class="container section-title aos-init aos-animate" data-aos="fade-up">
      <h2 data-i18n="gamemode.title">Choose your Style</h2>
    </div>

    <div class="container">
      <div class="row gy-4">
        <div class="col-lg-6 col-md-6 aos-init aos-animate" data-aos="fade-up" data-aos-delay="100">
          <div class="card" id="one-round">
            <img src="../assets/img/gamemode-one.jpg" alt="" class="img-fluid" data-i18n="[alt]gamemode.twoImg">
            <div class="card-body">
              <h3><a href="#" class="stretched-link" data-i18n="gamemode.two">One Round</a></h3>
              <div class="card-content">
              <p data-i18n="gamemode.tournamentDesc-one">All players compete for a single round where the loser is decided based on the first player who loses all their lives</p>
            </div>
              </div>
          </div>
        </div>
        <div class="col-lg-6 col-md-6 aos-init aos-animate" data-aos="fade-up" data-aos-delay="200">
          <div class="card" id="tournament-three">
            <img src="../assets/img/gamemode-tournament.jpg" alt="" class="img-fluid" data-i18n="[alt]gamemode.threeImg">
            <div class="card-body">
              <h3><a href="#" class="stretched-link" data-i18n="gamemode.three">Tournament Style</a></h3>
              <div class="card-content">
              <p data-i18n="gamemode.tournamentDesc">3/4 players compete in a round, with the loser eliminated, and the remaining players continue to play until one winner is declared.</p>
              </div>
              </div>
          </div>
        </div>
      </div>
    </div>
  `;

  container.querySelector("#one-round a").addEventListener("click", (e) => {
    e.preventDefault();
    updateState({ gameModeFlag: false });
    navigateTo("#form");
  });

  container.querySelector("#tournament-three a").addEventListener("click", (e) => {
    e.preventDefault();
    updateState({ gameModeFlag: true });
    navigateTo("#form");
  });
  return container;
}
