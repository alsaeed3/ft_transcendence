import { translateValue } from "../game/GameUtils.js";
import { getState } from "../stateManager.js";

export function ProfileView() {
  const state = getState();
  
  // Container for the profile view
  const container = document.createElement("section");
  container.id = "profile-section";
  container.className = "section";

  const {username, email, first_name, last_name, is_2fa_enabled} = JSON.parse(localStorage.getItem("user"));
  let otp_text = translateValue("profile.enable2FA");
  let otp_attr = "profile.enable2FA";
  if (is_2fa_enabled)
  {
    otp_attr = "profile.disable2FA";
    otp_text = translateValue("profile.disable2FA");
  }
  // Profile Information Display
  container.innerHTML = `
    <div class="profile-section">
    <div class="col mb-3 d-flex justify-content-center align-items-center" style="height: 100px;">
      <div class="profile-img-container">  
        <img src="assets/img/profile.png" height="100px" width="100px" class="profile-img" alt="Profile Image">
      </div>
    </div>
    <div class="row mb-3">
      <div class="col">
          <label class="profile-label"><strong data-i18n="profile.firstName">First Name:</strong></label>
          <p class="profile-data">${first_name || 'unknown'}</p>
        </div>
        <div class="col">
          <label class="profile-label"><strong data-i18n="profile.lastName">Last Name:</strong></label>
          <p class="profile-data">${last_name || 'unknown'}</p>
        </div>
      </div>
      <div class="row mb-3">
        <div class="col">
          <label class="profile-label"><strong data-i18n="profile.usernameLabel">Username:</strong></label>
          <p class="profile-data">${username || 'unknown'}</p>
        </div>
        <div class="col">
          <label class="profile-label"><strong data-i18n="profile.emailLabel">Email:</strong></label>
          <p class="profile-data">${email || 'unknown'}</p>
        </div>
      </div>
      <div class="row mb-3">
        <div class="col-md-12">
          <button data-action='otp' id="otp_button" class="btn btn-success w-100" data-i18n=${otp_attr}>${otp_text}</button>
        </div>
      </div>
      <div class="row mb-3">
      <div class="col-md-12">
        <a href="#history" class="btn btn-success w-100" data-i18n="profile.history">View Tournament History</a>
      </div>
    </div>
      <div class="row mb-3">
        <div class="col-md-12">
          <a href="#home" class="btn btn-success w-100" data-i18n="profile.backButton">Back to Home</a>
        </div>
      </div>
    </div>
  `;
  return container;
}
