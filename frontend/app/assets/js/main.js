import { handle2fa, verifyOTP, loginUser, loginWith42, logoutUser, registerUser } from "./auth/auth.js"

export function showAlert(message, alertType = 'danger', duration = 3000, customStyles = {}) {
  const alertBox = document.getElementById('alertBox');
  const alertMessage = document.getElementById('alertMessage');

  // Remove any existing alert type classes and add the new one
  alertBox.className = `alert alert-${alertType} fade show`;

  alertMessage.textContent = message;       // Set the alert message text
  alertBox.classList.remove('d-none');      // Show the alert

  // Apply custom styles if provided
  Object.assign(alertBox.style, customStyles);

  // Hide the alert after the specified duration
  setTimeout(() => {
    hideAlert();
  }, duration);
}


function hideAlert() {
  const alertBox = document.getElementById('alertBox');
  alertBox.classList.remove('show');   // Start fade-out
  setTimeout(() => {
    alertBox.classList.add('d-none');  // Hide element after fade-out
  }, 500); // Match Bootstrap's fade transition duration
}

export function validateForm()
{
	const needsValidation = document.querySelectorAll('.needs-validation')

	Array.prototype.slice.call(needsValidation)
	  .forEach(function(form) {
		form.addEventListener('submit', function(event) {
		  if (!form.checkValidity()) {
        event.preventDefault()
        event.stopPropagation()
		  }
		  form.classList.add('was-validated')
		}, false)
	})
}

async function handleLoginForm(e)
{
  const formData = new FormData(e.target);

  const username = formData.get("username") && formData.get("username").trim();
  const password = formData.get("password") && formData.get("password").trim();
  const otp_token = formData.get("otp") && formData.get("otp").trim();
  if (username && password)
  {
    const response = await loginUser({username, password, otp_token});
  }
  else {
    if (!username) {
      document.getElementById("yourUsername").classList.add("is-invalid");
    }
    if (!password) {
      document.getElementById("yourPassword").classList.add("is-invalid");
    }
  }
}

async function handleRegisterForm(e)
{
  const formData = new FormData(e.target);

  const fname = formData.get("firstName").trim();
  const lname = formData.get("lastName").trim();
  const email = formData.get("email").trim();
  const username = formData.get("username").trim();
  const password = formData.get("password").trim();  
  // Basic validation (you can extend this)
  if (fname && lname && email && username && password)
  {
    // Assuming registration is successful, store data in localStorage (this can be replaced by an API call)
    const data = {
      "first_name": fname,
      "last_name": lname,
      "email": email,
      "username": username,
      "password": password
    }
    const response = await registerUser(data);
    showAlert("Welcome " + fname, "success", 1000);

  }
}

export function setupGlobalHandlers() {
  document.addEventListener("click", async (e) => {
      if (e.target.matches("[data-action='logout']"))
      {
          const response = await logoutUser();
          // showAlert(response.message, "success", 1000);
      }
      if (e.target.matches("[data-action='otp']"))
        handle2fa();
      if (e.target.matches("[data-action='login_42']"))
        loginWith42();
  });

  document.addEventListener("submit", async (e) => {
    e.preventDefault(); // Prevent default form submission behavior

    if (e.target.matches("#qrForm"))
    {
      const value = e.target.querySelector("input").value;
      if (value)
        verifyOTP(value);
    }

    if (e.target.matches("#loginForm"))
      handleLoginForm(e);

    if (e.target.matches("#regForm"))
      handleRegisterForm(e);
  });
}

export function initNavBar()
{
  const mobileNavToggleBtn = document.querySelector('.mobile-nav-toggle');
  if (mobileNavToggleBtn)
    mobileNavToggleBtn.addEventListener('click', mobileNavToogle);

  function mobileNavToogle() 
  {
    document.querySelector('body').classList.toggle('mobile-nav-active');
    mobileNavToggleBtn.classList.toggle('bi-list');
    mobileNavToggleBtn.classList.toggle('bi-x');
  }

  document.querySelectorAll('#navmenu a').forEach(navmenu => {
    navmenu.addEventListener('click', () => {
      if (document.querySelector('.mobile-nav-active')) {
        mobileNavToogle();
      }
    });
  });

  document.querySelectorAll('.navmenu .toggle-dropdown').forEach(navmenu => {
    navmenu.addEventListener('click', function(e) {
      e.preventDefault();
      this.parentNode.classList.toggle('active');
      this.parentNode.nextElementSibling.classList.toggle('dropdown-active');
      e.stopImmediatePropagation();
    });
  });

  document.querySelector('.mobile-nav-toggle').addEventListener('click', function() {
    const navMenu = document.getElementById('navmenu');
    
    // Toggle the class on the menu
    if (navMenu.classList.contains('mobile-menu-active')) {
        navMenu.classList.remove('mobile-menu-active');
    } else {
        navMenu.classList.add('mobile-menu-active');
    }
  });
    // Trigger update when route changes
    window.addEventListener('hashchange', updateActiveNav);

    // Initial call to set active nav
    updateActiveNav();
}

function updateActiveNav() {
  const currentHash = window.location.hash || '#select_pong'; // Default to #home if no hash
  document.querySelectorAll('#navmenu a').forEach(link => {
    if (link.getAttribute('href') === currentHash) {
      link.classList.add('active');
    } else {
      link.classList.remove('active');
    }
  });
}

export function enableTouchControlsForMobile(playerObjects) {
  const isMobile = window.innerWidth <= 1024;
  const canvas = document.getElementById("gameCanvas");
  if (!canvas) return
  if (isMobile) 
  {
      showAlert("Mobile Mode Activated", "info", 1000);
      canvas.addEventListener("touchmove", (e)=> handleTouchMove(e, playerObjects, canvas));
  } 
  else 
  {
      canvas.removeEventListener("touchmove", (e)=> handleTouchMove(e, playerObjects));
  }
}

function checkDeadZone(touchX, touchY, playerObjects, canvas)
{
  const ph = playerObjects[0].paddleHeight * 0.9;
  const ch = canvas.height;
  const cw = canvas.width;
  if ((touchX <= ph && touchY <= ph) || (touchX <= ph && touchY >= ch - ph) || (touchX >= cw - ph && touchY <= ph) || (touchX >= cw - ph && touchY >= ch - ph))
    return true;
  return false;
}

function handleTouchMove(e, playerObjects, canvas) 
{
  e.preventDefault();
  const rect = canvas.getBoundingClientRect();
  Array.from(e.touches).forEach((touch) => {
  const touchX = (touch.clientX - rect.left) * (canvas.width / rect.width);
  const touchY = (touch.clientY - rect.top) * (canvas.height / rect.height);
  if (playerObjects[2] || playerObjects[3])
  {
    if (checkDeadZone(touchX, touchY, playerObjects, canvas))
      return;
  }

  if (touchX <= playerObjects[0].paddleWidth) {
    if (playerObjects[0]) 
    {
    playerObjects[0].paddleY = Math.min(
        Math.max(touchY - playerObjects[0].paddleHeight / 2, 0),
        canvas.height - playerObjects[0].paddleHeight 
    );
    }
    }

    if (touchX >= canvas.width - playerObjects[1].paddleWidth - 10) {
        if (playerObjects[1]) {
            playerObjects[1].paddleY = Math.min(
                Math.max(touchY - playerObjects[1].paddleHeight / 2, 0),
                canvas.height - playerObjects[1].paddleHeight
            );
        }
      }

  if (touchY <= playerObjects[0].paddleHeight - 10) {
      if (playerObjects[2]) {
          playerObjects[2].paddleX = Math.min(
              Math.max(touchX - playerObjects[2].paddleWidth / 2, 0),
              canvas.width - playerObjects[2].paddleWidth
          );
      }
  }

  if (touchY >= canvas.height - playerObjects[0].paddleWidth - 10) {
    if (playerObjects[3]) {
        playerObjects[3].paddleX = Math.min(
            Math.max(touchX - playerObjects[3].paddleWidth / 2, 0),
            canvas.width - playerObjects[3].paddleWidth
        );
    }
  }
  
    
});
}
