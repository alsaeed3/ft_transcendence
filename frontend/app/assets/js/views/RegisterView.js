export function RegisterView()
{
	const section = document.createElement("section");
  section.id = "register";
  section.className = "register section min-vh-100 d-flex flex-column align-items-center justify-content-center py-4";

  section.innerHTML = `
  <div class="container">
    <div class="row justify-content-center">
            <div class="col-lg-4 col-md-6 d-flex flex-column align-items-center justify-content-center">

              <div class="card mb-3 bg-dark p-5 rounded shadow-lg">

                <div class="card-body">

                  <div class="pt-4 pb-2">
                    <h5 class="card-title text-center pb-0 fs-4" data-i18n="register.createAccount">Create an Account</h5>
                    <p class="text-center small" data-i18n="register.enterDetails">Enter your personal details to create account</p>
                  </div>

                  <form id="regForm" class="row g-3" novalidate="">
                    <div class="col-12">
                      <label for="firstName" class="form-label" data-i18n="register.firstName">First Name</label>
                      <input type="text" name="firstName" class="form-control" id="firstName" required>
                      <div class="invalid-feedback" data-i18n="register.invalidFirstName">Please, enter your first name!</div>
                    </div>
                    <div class="col-12">
                      <label for="lastName" class="form-label" data-i18n="register.lastName">Last Name</label>
                      <input type="text" name="lastName" class="form-control" id="lastName" required>
                      <div class="invalid-feedback" data-i18n="register.invalidLastName">Please, enter your last name!</div>
                    </div>

                    <div class="col-12">
                      <label for="yourEmail" class="form-label" data-i18n="register.yourEmail">Your Email</label>
                      <input type="email" name="email" class="form-control" id="yourEmail" required>
                      <div class="invalid-feedback" data-i18n="register.invalidEmail">Please enter a valid Email adddress!</div>
                    </div>

                    <div class="col-12">
                      <label for="yourUsername" class="form-label" data-i18n="register.username">Username</label>
                      <div class="input-group has-validation">
                        <input type="text" name="username" class="form-control" id="yourUsername" required>
                        <div class="invalid-feedback" data-i18n="register.invalidUsername">Please choose a username.</div>
                      </div>
                    </div>

                    <div class="col-12">
                      <label for="yourPassword" class="form-label" data-i18n="register.password">Password</label>
                      <input type="password" name="password" class="form-control" id="yourPassword" required>
                      <div class="invalid-feedback" data-i18n="register.invalidPassword">Please enter your password!</div>
                    </div>

                    <div class="col-12">
                      <button class="btn btn-success w-100" type="submit" data-i18n="register.createButton">Create Account</button>
                    </div>
                    <div class="col-12">
                      <p class="small d-inline mb-0" data-i18n="register.alreadyAccount">Already have an account?
                      </p> 
                      <a class="small" href="#login" data-i18n="register.login">Log in</a>
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
