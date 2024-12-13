import { navigateTo } from "../routes.js"; // Assuming a simple navigate function
import { updateState } from "../stateManager.js"; // Your custom state manager

export function MultiPong() {
  const container = document.createElement("section");
  container.id = "featured-services";
  container.className = "featured-services section";

  container.innerHTML = `
    <div class="container section-title aos-init aos-animate" data-aos="fade-up">
      <h2 data-i18n="ppmulti.title">Multiple Players</h2>
    </div>

    <div class="container">
      <div class="row gy-4">
        <div class="col-lg-4 col-md-6 aos-init aos-animate" data-aos="fade-up" data-aos-delay="100">
          <div class="card" id="two-players">
            <img src="../assets/img/pp-two-img.webp" alt="" class="img-fluid" data-i18n="[alt]ppmulti.twoImg">
            <div class="card-body">
              <h3><a href="#" class="stretched-link" data-i18n="ppmulti.two">2 Players</a></h3>
            </div>
          </div>
        </div>
        <div class="col-lg-4 col-md-6 aos-init aos-animate" data-aos="fade-up" data-aos-delay="200">
          <div class="card" id="three-players">
            <img src="../assets/img/pp-three-img.webp" alt="" class="img-fluid" data-i18n="[alt]ppmulti.threeImg">
            <div class="card-body">
              <h3><a href="#" class="stretched-link" data-i18n="ppmulti.three">3 Players</a></h3>
            </div>
          </div>
        </div>
        <div class="col-lg-4 col-md-6 aos-init aos-animate" data-aos="fade-up" data-aos-delay="200">
          <div class="card" id="four-players">
            <img src="../assets/img/pp-four-img.webp" alt="" class="img-fluid" data-i18n="[alt]ppmulti.fourImg">
            <div class="card-body">
              <h3><a href="#" class="stretched-link" data-i18n="ppmulti.four">4 Players</a></h3>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
  container.querySelector("#two-players a").addEventListener("click", (e) => {
    e.preventDefault();
    updateState({ playerCount: 2 });
    navigateTo("#form");
  });

  container.querySelector("#three-players a").addEventListener("click", (e) => {
    e.preventDefault();
    updateState({ playerCount: 3 });
    navigateTo("#gameMode");
  });

  container.querySelector("#four-players a").addEventListener("click", (e) => {
    e.preventDefault();
    updateState({ playerCount: 4 });
    navigateTo("#gameMode");
  });
  return container;
}
