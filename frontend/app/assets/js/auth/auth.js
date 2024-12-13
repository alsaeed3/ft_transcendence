import { translateValue } from "../game/GameUtils.js";
import { showAlert } from "../main.js";
import { navigateTo } from "../routes.js";

export function setLocalStorage(data)
{
  const {access, refresh, user} = data;
  localStorage.setItem("access", access);
  localStorage.setItem("refresh", refresh);
  localStorage.setItem("user", JSON.stringify(user));
  localStorage.setItem("isLoggedIn", "true");
}

export function removeLocalStorage()
{
  localStorage.removeItem("access");
  localStorage.removeItem("refresh");
  localStorage.removeItem("user");
  localStorage.setItem("isLoggedIn", "false");
}

async function verifyAccessToken() {
  const access = localStorage.getItem("access");
  const username = JSON.parse(localStorage.getItem("user"))?.username;
  const refresh = localStorage.getItem("refresh");
  if (!access || !username || !refresh)
    return "invalid";

  try {
    const response = await fetch('https://127.0.0.1:3500/api/user/token/verify/', {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ access, refresh, username }),
    });

    if (response.ok) return "valid";

    const result = await response.json();
    if (result.message[0] === "Token is expired") return "expired";

    return "invalid";
  } catch (error) {
    return "invalid";
  }
}

async function generateNewToken()
{
  const data = {
    "refresh": localStorage.getItem("refresh"),
    "username": JSON.parse(localStorage.getItem("user")).username
  }
  const response = await fetch("https://127.0.0.1:3500/api/user/token/refresh/",
  {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data)
  })
  if (response.ok)
  {
    const result = await response.json();
    localStorage.setItem("access", result.access);
    localStorage.setItem("refresh", result.refresh);
    return true;
  }
  else
  {
    handleErrors(response, "generateNewToken");
    return false;
  }
}

async function checkAccessToken()
{
  const tokenStatus = await verifyAccessToken();
  if (tokenStatus === "invalid")
  {
    showAlert("Please log in again", "danger", 3000);
    removeLocalStorage();
    navigateTo("#login");
    return false;
  }
  else if (tokenStatus === "expired")
  {
    const newToken = await generateNewToken();
    if (!newToken)
    {
      showAlert("Please log in again", "danger", 3000);
      removeLocalStorage();
      navigateTo("#login");
      return false;
    }
  }
  return true;
}

export async function handleErrors(response, funcName)
{
  if (response.status === 400)
  {
    const errorData = await response.json();
      for (const field in errorData) 
      {
        errorData[field].forEach((message) => {
          if (field && message)
            showAlert(`${field.toUpperCase()}: ${message}`, "danger");
        });
      }
  }
  else
  {
    showAlert(response.status + ": An error occurred. Please try again.", "danger", 3000);
    if (funcName === "logoutUser")
    {
      removeLocalStorage();
      navigateTo("#login");
    }
  }
  
}

export async function registerUser(data) {
  try {
      const response = await fetch("https://127.0.0.1:3500/api/user/register/", {
          method: "POST",
          headers: {
              "Content-Type": "application/json",
          },
          body: JSON.stringify(data),
      });
      if (response.ok) 
      {
          try {
              const result = await response.json();
              setLocalStorage(result);
              localStorage.setItem("isLoggedIn", "true");
              navigateTo("#home");
          } 
          catch (jsonError) 
          {
              showAlert("There was an issue with the server response. Please try again.", "danger");
          }
      } 
      else
        handleErrors(response, "registerUser");
      
  } catch (error) 
  {
      showAlert("A network error occurred in User Registration. Please try again later.", "danger");
  }
}



async function enable2fa()
{
  navigateTo("#qr");
  try {
        const username = JSON.parse(localStorage.getItem("user")).username;
        const id = JSON.parse(localStorage.getItem("user")).id;
        const response = await fetch("https://127.0.0.1:3500/api/user/2fa/enable/", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": "Bearer " + localStorage.getItem("access")
        },
        body: JSON.stringify({username, id}),
      });
      if (response.ok) 
      {
        const data = await response.json();
        const { qr_code } = data;
        document.getElementById("qrImg").src =`data:image/png;base64,${qr_code}` ;
      }
      else
      {
        navigateTo("#profile");
        handleErrors(response, "enable2fa");
      }
      
  } catch (error) 
  {
    showAlert("An error occurred in enabling 2FA. Please try again.", "danger");
  }
}

async function disable2fa()
{
  try {
    const username = JSON.parse(localStorage.getItem("user")).username;
    const id = JSON.parse(localStorage.getItem("user")).id;
    const response = await fetch("https://127.0.0.1:3500/api/user/2fa/disable/", {
    method: "POST",
    headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + localStorage.getItem("access")
    },
    body: JSON.stringify({username, id}),
  });
  if (response.ok) 
  {
    showAlert("Successfully disabled 2FA", "success", 3000);
    const result = await response.json();
    localStorage.setItem("user", JSON.stringify(result.user));
    document.getElementById("otp_button").textContent = translateValue("profile.enable2FA");
  }
  else
    handleErrors(response, "disable2fa");
  } catch (error) 
  {
    showAlert("An error occurred in disabling 2FA. Please try again.", "danger");
  }
}

export async function handle2fa()
{
  const isIntraUser = JSON.parse(localStorage.getItem("user")).intra_login;
  if (isIntraUser)
  {
    showAlert("Intra users cannot enable 2FA", "danger", 3000);
    return;
  }
  if (!await checkAccessToken())
    return;
  const { is_2fa_enabled } = JSON.parse(localStorage.getItem("user"));
  if (!is_2fa_enabled)
    enable2fa();
  else if (is_2fa_enabled)
    disable2fa();
}

export async function verifyOTP(otp_token)
{
  if (!await checkAccessToken())
    return;
    const username = JSON.parse(localStorage.getItem("user")).username;
    const id = JSON.parse(localStorage.getItem("user")).id;
    try {
        const response = await fetch("https://127.0.0.1:3500/api/user/2fa/verify/", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
        				"Authorization": "Bearer " + localStorage.getItem("access")
            },
            body: JSON.stringify({username, id, otp_token}),
        });
        if (response.ok) 
        {
          showAlert("Successfully verified OTP", "success", 3000);
          const result = await response.json();
          localStorage.setItem("user", JSON.stringify(result.user));
          navigateTo("#home");
        }
        else
          handleErrors(response, "verifyOTP");
    } catch (error) 
    {
        showAlert("An error occurred in verifying OTP. Please try again.", "danger");
    }
}

export async function loginUser(data) 
{
  try {
      const response = await fetch("https://127.0.0.1:3500/api/user/login/", {
          method: "POST",
          headers: {
              "Content-Type": "application/json",
          },
          body: JSON.stringify(data)
      });
      if (response.ok)
      {
          const result = await response.json();
          localStorage.setItem("isLoggedIn", "true");
          setLocalStorage(result);
          navigateTo("#home");
      }
      else
        handleErrors(response, "loginUser");

  } catch (error)
  {
      showAlert("An error occurred during login. Please try again.", "danger");
  }
}

export async function logoutUser()
{
  if (!await checkAccessToken())
    return;
  const data =
  {
    "refresh": localStorage.getItem("refresh"),
    "username": JSON.parse(localStorage.getItem("user")).username
  }
  try {
      const response = await fetch("https://127.0.0.1:3500/api/user/logout/", {
          method: "POST",
		  headers: {
				"Content-Type": "application/json",
				"Authorization": "Bearer " + localStorage.getItem("access")
			},
          body: JSON.stringify(data),
      })
	  if (response.ok) 
    {
      localStorage.setItem("isLoggedIn", "false");
      removeLocalStorage();
      navigateTo("#login");
	  }
	  else
      handleErrors(response, "logoutUser");
  } catch (error) 
  {
      showAlert("An error occurred during logout. Please try again.", "danger");
  }
}

export function handle42Redirect()
{

  const currentHash = window.location.hash;
  const queryString = currentHash.slice(5); // Removes the '#42ad' part
  const urlParams = new URLSearchParams(queryString);
  if (urlParams.has("error"))
  {
    showAlert("Failed to log in with 42", "danger", 3000);
    navigateTo("#login");
    return;
  }
  const access = urlParams.get("access");
  const refresh = urlParams.get("refresh");

  const id = urlParams.get("id");
  const username = urlParams.get("username");
  const email = urlParams.get("email");
  const first_name = urlParams.get("first_name");
  const last_name = urlParams.get("last_name");
  const intra_login = urlParams.get("intra_login");
  const user = {
    id,
    username,
    email,
    first_name,
    last_name,
    intra_login
  }

  if (access && refresh && user) {
    // Store tokens in local storage
    localStorage.setItem("access", access);
    localStorage.setItem("refresh", refresh);
    localStorage.setItem("user", JSON.stringify(user));
    localStorage.setItem("isLoggedIn", "true");

    // Clear URL params to keep the URL clean
    window.history.replaceState({}, document.title, window.location.pathname);
    navigateTo("#home");
    showAlert("Successfully logged in with 42", "success", 3000);
  } 
  else
    showAlert("Failed to log in with 42", "danger", 3000);
}

export function loginWith42() {
  window.location.href = "https://127.0.0.1:3500/api/auth/42/";
}

export async function handleTournamentData(data)
{

  if (!await checkAccessToken())
    return;
  try {
      const response = await fetch("https://127.0.0.1:3500/api/user/tournaments/", {
          method: "POST",
          headers: {
              "Content-Type": "application/json",
              "Authorization": "Bearer " + localStorage.getItem("access")
          },
          body: JSON.stringify(data)
      })
      if (!response.ok)
        handleErrors(response, "handleTournamentData");
  } catch (error) {
      console.error(error);
  }
}

export async function fetchAndRenderTournaments(section) {
  if (!await checkAccessToken())
    return;
  
  try {
      // Replace with your API endpoint
      const response = await fetch("https://127.0.0.1:3500/api/user/tournaments/", {
    headers: {
      "Authorization": "Bearer " + localStorage.getItem("access")
    }
  }
  );
      if (!response.ok) {
          throw new Error("Failed to fetch tournaments.");
      }

      const tournaments = await response.json();
      // Reference to the container for the tournaments
      const tournamentList = section.querySelector("#tournament-list");

      // Clear previous content (if any)
      tournamentList.innerHTML = "";

      // Loop through the tournaments and create cards
      if (tournaments.length === 0) {
        const card = document.createElement("div");
        card.className = "col";
        card.innerHTML = `
            <div data-i18n="history.empty" class="alert alert-success text-center" role="alert">
                ${translateValue("history.empty")}
            </div>
        `;
        tournamentList.appendChild(card);
      }
      tournaments.forEach(tournament => {
          const card = document.createElement("div");
          card.className = "col-md-6 col-lg-4";

          card.innerHTML = `
          <div class="card shadow-sm">
              <div class="card-body">
                  <h5 class="card-title">${tournament.creator_name}<span data-i18n="history.title"> ${translateValue("history.title")}</span></h5>
                  <p class="card-text"><strong data-i18n="history.participants">${translateValue("history.participants")}</strong></p>
                  <div class="container">
                      <div class="row">
                          ${tournament.participants_names.map((name, index) => {
                              const isWinner = name === tournament.winner_nickname;
                              return `
                                  <div class="col-6">
                                      <p class="participant ${isWinner ? 'winner' : ''}">${name}</p>
                                  </div>
                                  ${index % 2 === 1 ? '</div><div class="row">' : ''}
                              `;
                          }).join('')}
                      </div>
                  </div>
              </div>
          </div>
      `;
      
      

          tournamentList.appendChild(card);
      });
  } catch (error) {

      // Add an error alert to the section
      const tournamentList = section.querySelector("#tournament-list");
      tournamentList.innerHTML = `
          <div class="alert alert-danger text-center" role="alert">
              Failed to load tournaments. Please try again later.
          </div>
      `;
  }
}