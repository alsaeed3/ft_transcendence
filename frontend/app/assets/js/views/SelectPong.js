import { updateState } from "../stateManager.js";
import { navigateTo } from "../routes.js";

export function SelectPong() {
  const section = document.createElement("section");
  section.id = "featured-services";
  section.className = "featured-services section";

  section.innerHTML = `
    <div class="container section-title aos-init aos-animate" data-aos="fade-up">
      <h2 data-i18n="ppmode.title">Choose Your Mode</h2>
    </div>
    
    <div class="container">
      <div class="row gy-4">
        <div class="col-lg-4 col-md-6 aos-init aos-animate" data-aos="fade-up" data-aos-delay="100">
          <div class="card">
            <img src="../assets/img/pp_single_img.webp" alt="" class="img-fluid" data-i18n="[alt]ppmode.singleImg">
            <div class="card-body">
              <h3><a href="#form" id="one_player" class="stretched-link" data-i18n="ppmode.single">Single Player</a></h3>
              <div class="card-content">
                <p data-i18n="ppmode.singleDesc">Futuristic duel between a human and an AI in a minimalistic pong setting</p>
              </div>
            </div>
          </div>
        </div>
        
        <div class="col-lg-4 col-md-6 aos-init aos-animate" data-aos="fade-up" data-aos-delay="200">
          <div class="card">
            <img src="../assets/img/pp-multi-img.webp" alt="" class="img-fluid" data-i18n="[alt]ppmode.multiImg">
            <div class="card-body">
              <h3><a href="#multi_pong" class="stretched-link" data-i18n="ppmode.multi">Multiple Player</a></h3>
              <div class="card-content">
                <p data-i18n="ppmode.multiDesc">Engage in a vibrant pong battle with 2-4 players in a futuristic arcade setting</p>
              </div>
            </div>
          </div>
        </div>

        <div class="col-lg-4 col-md-6 aos-init aos-animate" data-aos="fade-up" data-aos-delay="300">
          <div class="card">
            <img src="../assets/img/pp_tournament_img.webp" alt="" class="img-fluid" data-i18n="[alt]ppmode.tournamentImg">
            <div class="card-body">
              <h3><a href="#form" id="eight_players" class="stretched-link" data-i18n="ppmode.tournament">Tournament</a></h3>
              <div class="card-content">
                <p data-i18n="ppmode.tournamentDesc">Intense 8-player pong tournament captured in a focused, competitive scene</p>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  `;

    section.querySelector("#eight_players").addEventListener("click", (e) => {
        updateState({tournament: true, playerCount: 8});
        navigateTo("#form");
    });
    section.querySelector("#one_player").addEventListener("click", (e) => {
      updateState({playerCount: 1});
      navigateTo("#form");
    });
  return section;
}
