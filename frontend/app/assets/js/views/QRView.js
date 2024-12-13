export function QRView() {
  const container = document.createElement("section");
  container.className = "d-flex flex-column align-items-center justify-content-center min-vh-100 py-4";

  // Append the hero section
  container.innerHTML = `
          <div class="text-center">
            <div class="row d-flex flex-column align-items-center justify-content-center" data-aos="zoom-out">
                <div class="col-lg-6 col-md-6">
                    <img id="qrImg" src="assets/img/profile.png" alt="QR image" class="img-fluid mb-3">
                    <p class="text-white" data-i18n="qr.description">Scan to activate 2FA.</p>
                </div>
                <form id="qrForm" class="d-flex flex-column align-items-center justify-content-center g-3" novalidate="">
                  <div class="col-lg-6 col-md-6 mb-3">
                    <label for="yourOTP" class="form-label" data-i18n="qr.qrLabel">OTP</label>
                    <div class="input-group has-validation">
                      <input type="text" name="qr" class="form-control" id="yourOTP" minlength="6" maxlength="6" required>
                      <div class="invalid-feedback" data-i18n="qr.invalidOtp">Please enter valid OTP.</div>
                    </div>
                </div>
                <div class="col-lg-6 col-md-6">
                  <button class="btn btn-success w-100" type="submit" data-i18n="qr.submitButton">Verify</button>
                </div>

              </form>

            </div>
          </div>
    `;
  return container;
}
