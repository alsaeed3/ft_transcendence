import { router } from '/assets/js/modules/router.js';
import { setupRegistrationForm, setupLoginForm } from '/assets/js/modules/auth.js';

// Load components dynamically
const loadComponent = async (path) => {
    const response = await fetch(path);
    return response.text();
};

// Define routes
router.addRoute('#/', async () => {
    document.getElementById('main').innerHTML = `
        <h1 class="text-center mt-5">Welcome to Pong Game</h1>
    `;
});

router.addRoute('#/login', async () => {
    document.getElementById('main').innerHTML = await loadComponent('/assets/components/auth/login.html');
    setupLoginForm();
});

router.addRoute('#/register', async () => {
    document.getElementById('main').innerHTML = await loadComponent('/assets/components/auth/register.html');
    setupRegistrationForm();
});

router.addRoute('#/about', async () => {
    document.getElementById('main').innerHTML = await loadComponent('/assets/components/about.html');
});

router.addRoute('#/pong', async () => {
    document.getElementById('main').innerHTML = await loadComponent('/assets/components/pong.html');
    // Initialize Pong game
    const script = document.createElement('script');
    script.src = '/assets/js/pong.js';
    document.body.appendChild(script);
});

// Initialize router
router.init();

// Load header and footer
document.addEventListener('DOMContentLoaded', async () => {
    document.getElementById('header').innerHTML = await loadComponent('/assets/components/header.html');
    document.getElementById('footer').innerHTML = await loadComponent('/assets/components/footer.html');
});