export function AboutView() {
  const section = document.createElement("section");
  section.id = "team";
  section.className = "team section";

  section.innerHTML = `
    <div class="container section-title aos-init aos-animate" data-aos="fade-up">
      <h2 data-i18n="aboutview.title">Team</h2>
    </div>
    
    <div class="container">
      <div class="row gy-4 d-flex justify-content-center">
      
        <div class="col-lg-3 col-md-6 aos-init aos-animate" data-aos="fade-up" data-aos-delay="100">
          <div class="card">
            <img src="assets/img/team/team-2.jpg" alt="" class="img-fluid" data-i18n="[alt]aboutview.teamoneImg">
            <div class="card-body">
              <h3><a class="stretched-link" data-i18n="aboutview.teamone">Alexandr Serebryakov</a></h3>
              <div class="card-content">
                <p data-i18n="aboutview.teamoneDesc">Software Developer</p>
              </div>
            </div>
          </div>
        </div>
        
        <div class="col-lg-3 col-md-6 aos-init aos-animate" data-aos="fade-up" data-aos-delay="100">
          <div class="card">
            <img src="assets/img/team/team-3.jpg" alt="" class="img-fluid" data-i18n="[alt]aboutview.teamtwoImg">
            <div class="card-body">
              <h3><a class="stretched-link" data-i18n="aboutview.teamtwo">Artur Khabibrakhmanov</a></h3>
              <div class="card-content">
                <p data-i18n="aboutview.teamtwoDesc">Data Scientist</p>
              </div>
            </div>
          </div>
        </div>

        <div class="col-lg-3 col-md-6 aos-init aos-animate" data-aos="fade-up" data-aos-delay="100">
          <div class="card">
            <img src="assets/img/team/team-1.png" alt="" class="img-fluid" data-i18n="[alt]aboutview.teamthreeImg">
            <div class="card-body">
              <h3><a class="stretched-link" data-i18n="aboutview.teamthree">Aram Keryan</a></h3>
              <div class="card-content">
                <p data-i18n="aboutview.teamthreeDesc">Data Scientist / Educator</p>
              </div>
            </div>
          </div>
        </div>
        
        <div class="col-lg-3 col-md-6 aos-init aos-animate" data-aos="fade-up" data-aos-delay="200">
          <div class="card">
            <img src="assets/img/team/team-4.jpg" alt="" class="img-fluid" data-i18n="[alt]aboutview.teamfourImg">
            <div class="card-body">
              <h3><a  class="stretched-link" data-i18n="aboutview.teamfour">Nauman Munir</a></h3>
              <div class="card-content">
                <p data-i18n="aboutview.teamfourDesc">Software Developer</p>
              </div>
            </div>
          </div>
        </div>

        <div class="col-lg-3 col-md-6 aos-init aos-animate" data-aos="fade-up" data-aos-delay="300">
          <div class="card">
            <img src="assets/img/team/team-5.jpg" alt="" class="img-fluid" data-i18n="[alt]aboutview.teamfiveImg">
            <div class="card-body">
              <h3><a class="stretched-link" data-i18n="aboutview.teamfive">Alaa Bashir</a></h3>
              <div class="card-content">
                <p data-i18n="aboutview.teamfiveDesc">Mechanical Engineer</p>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  `;
  return section;
}
