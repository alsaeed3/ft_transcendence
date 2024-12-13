// components/Hero.js

export function Hero() {
  const heroSection = document.createElement("section");
  heroSection.id = "home";
  heroSection.className = "hero section dark-background";

  heroSection.innerHTML = `
        <div class="container text-center">
            <div class="row justify-content-center" data-aos="zoom-out">
                <div class="col-lg-8">
                    <img src="assets/img/logo.webp" width="400px" alt="" class="img-fluid mb-3" data-i18n="[alt]home.logoAlt">
                    <h2 data-i18n="home.title">Ready, Set, Game On!</h2>
                    <p data-i18n="home.description">Step into a world of endless excitement and epic challenges!</p>
                    <a href="#select_pong" class="btn-get-started" data-i18n="home.playButton">Play!</a>
                </div>
            </div>
        </div>
    `;

  return heroSection;
}
