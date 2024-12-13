export function LoginView() {
  const section = document.createElement("section");
  section.id = "login";
  section.className = "section login min-vh-100 d-flex flex-column align-items-center justify-content-center py-4";

  section.innerHTML = `
        <div class="container">
          <div class="row justify-content-center">
            <div class="col-lg-4 col-md-6 d-flex flex-column align-items-center justify-content-center">

              <div class="card mb-3 bg-dark p-5 rounded shadow-lg">

                <div class="card-body">

                  <div class="pt-4 pb-2">
                    <h5 class="card-title text-center pb-0 fs-4" data-i18n="login.title">Login to Your Account</h5>
                    <p class="text-center small" data-i18n="login.subtitle">Enter your username &amp; password to login</p>
                  </div>

                  <form id="loginForm" class="row g-3" novalidate="">

                    <div class="col-12">
                      <label for="yourUsername" class="form-label" data-i18n="login.usernameLabel">Username</label>
                      <div class="input-group has-validation">
                        <span class="input-group-text" id="inputGroupPrepend">@</span>
                        <input type="text" name="username" class="form-control" id="yourUsername" required>
                        <div class="invalid-feedback" data-i18n="login.usernameError">Please enter your username.</div>
                      </div>
                    </div>

                    <div class="col-12">
                      <label for="yourPassword" class="form-label" data-i18n="login.passwordLabel">Password</label>
                      <input type="password" name="password" class="form-control" id="yourPassword" required>
                      <div class="invalid-feedback" data-i18n="login.passwordError">Please enter your password!</div>
                    </div>

                    <div class="col-12">
                      <label for="otp_code" class="form-label" data-i18n="login.otp">Enter your OTP if enabled</label>
                      <input type="text" name="otp" data-i18n="login.otpPlaceholder" class="form-control" id="otp_code">
                    </div>

                    <div class="col-12">
                      <button class="btn btn-success w-100" type="submit" data-i18n="login.submitButton">Login</button>
                    </div>

                    <div class="col-12">
                      <button data-action='login_42' class="btn btn-success w-100" type="button" data-i18n="login.loginIntra">Login with intra</button>
                    </div>

                    <div class="col-12">
                      <p class="small mb-0 d-inline" data-i18n="login.noAccount">
                        Don't have an account? 
                        </p>
                        <a class="small" href="#register" data-i18n="login.createAccount">Create an account</a>
                    </div>

                  </form>

                </div>
              </div>

            </div>
          </div>
        </div>
  `;
  return section;
}
