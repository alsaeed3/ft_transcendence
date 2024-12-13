export function NotFound() {
  const container = document.createElement("div");
  container.className = "d-flex flex-column justify-content-center align-items-center vh-100"; // Bootstrap classes for full-height, centered content

  container.innerHTML = `
    <div class="text-center" style="padding: 20px;">
      <h1 class="display-1" style="text-shadow: 3px 3px yellow;" data-i18n="404.title">404</h1>
      <p class="fs-4 fw-bold mb-4" style="background-color: black; padding: 20px; color: white;" data-i18n="404.message">
        Oops! You broke the internet!
      </p>
      <a href="#home" class="btn btn-outline-light btn-lg" data-i18n="404.link">
        Go back to safety!
      </a>
    </div>
  `;

  return container;
}
