import { translateValue } from "../game/GameUtils.js";
import { showAlert } from "../main.js";
import { navigateTo } from "../routes.js";
import { getState, updateState } from "../stateManager.js";

function validatePlayerName(name)
{
  const maliciousPattern = /[^a-zA-Z0-9\s]/; // Allow only alphanumeric and space characters
  return name.length > 0 && name.length <= 10 && !maliciousPattern.test(name);
}

function showErrorMessage(message, messageText)
{
  message.style.display = "block";
  message.textContent = messageText;
  message.classList.add("alert", "alert-danger"); // Apply Bootstrap alert styles
}

export function FormView() {
  const { playerCount } = getState();

  
  if (!playerCount || playerCount.length === 0) {
    navigateTo("#select_pong");
    return;
  }
  const isLoggedIn = localStorage.getItem("isLoggedIn");
  if (playerCount === 8 && (!isLoggedIn || isLoggedIn === "false"))
  {
    navigateTo("#login");
    showAlert("You must be logged in to play a tournament", "danger", 3000);
    return;
  }

  
  let currentPlayerIndex = 0;
  let playerNames = [];

  const container = document.createElement("div");
  container.className = "form-section vh-100 d-flex justify-content-center align-items-center"; // Full height and centered content

  const form = document.createElement("form");
  form.className = "player-form bg-dark p-5 rounded shadow-lg"; // Dark background, padding, rounded corners, shadow

  const title = document.createElement("h2");
  title.className = "text-white text-center mb-4"; // Centered white text
  title.textContent = translateValue("form.title");
  title.setAttribute("data-i18n", "form.title"); // Title localization

  const label = document.createElement("label");
  label.setAttribute("data-i18n", "form.label"); // Label localization
  label.textContent = translateValue("form.label");
  label.setAttribute("for", "playerNameInput");
  label.className = "form-label text-white"; // White label

  const span = document.createElement("span");
  span.textContent = " 1:";
  span.className = "form-label text-white";
  span.style.fontWeight = "bold";

  const input = document.createElement("input");
  input.setAttribute("type", "text");
  input.setAttribute("id", "playerNameInput");
  input.setAttribute("data-i18n-placeholder", "form.inputPlaceholder"); // Input placeholder localization
  input.setAttribute("placeholder", translateValue("form.inputPlaceholder"));
  input.setAttribute("required", true);
  input.setAttribute("maxlength", 10);
  input.setAttribute("autofocus", true);
  input.className = "form-control form-control-lg mb-3"; // Large form control and margin-bottom

  const message = document.createElement("p"); // To show error messages
  message.className = "error-message mt-2"; // Add margin-top for spacing
  message.style.display = "none"; // Initially hidden
  message.setAttribute("data-i18n", "form.errorMessage"); // Error message localization

  const submitButton = document.createElement("button");
  submitButton.className = "btn btn-success btn-lg w-100 mt-3"; // Full width button with margin-top
  submitButton.textContent = translateValue("form.submitButton");
  submitButton.setAttribute("data-i18n", "form.submitButton"); // Submit button localization

  form.appendChild(title);
  form.appendChild(label);
  form.appendChild(span);
  form.appendChild(input);
  form.appendChild(message);
  form.appendChild(submitButton); // Add the submit button
  container.appendChild(form);

  // Attach event listener for when user presses "Enter" on the form
  form.addEventListener("submit", (e) => {
    e.preventDefault(); // Prevent form submission
    const playerName = input.value.trim();

    let invalidName = translateValue("form.errorMessage");
    let dupName = translateValue("form.usedNameError");
    let labelContent = translateValue("form.label");
    
    span.textContent = " " + (currentPlayerIndex + 2) + ":";

    if (!validatePlayerName(playerName))
      showErrorMessage(message, invalidName);
    else if (playerNames.includes(playerName))
      showErrorMessage(message, dupName);
    else
    {
      playerNames.push(playerName);
      currentPlayerIndex++;
      if (currentPlayerIndex < playerCount)
      {
        label.textContent = labelContent;
        input.value = "";
        message.style.display = "none";
      }
      else
      {
        updateState({ players: playerNames });
        if (playerNames.length === 8)
          navigateTo("#tournament");
        else
          navigateTo("#game");
      }
    }
  });

  return container;
}