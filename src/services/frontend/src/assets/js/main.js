// document.getElementById('fetchData').addEventListener('click', fetchData);

// async function fetchData() {
//     try {
//         const response = await fetch('http://localhost:80/api/data/');
//         const data = await response.json();
//         displayData(data);
//     } catch (error) {
//         console.error('Error fetching data:', error);
//     }
// }

// function displayData(data) {
//     const contentDiv = document.getElementById('content');
//     contentDiv.innerHTML = '';

//     if (Array.isArray(data) && data.length > 0) {
//         data.forEach(item => {
//             const itemElement = document.createElement('div');
//             itemElement.className = 'card mb-3';
//             itemElement.innerHTML = `
//                 <div class="card-body">
//                     <h5 class="card-title">${item.title}</h5>
//                     <p class="card-text">${item.description}</p>
//                 </div>
//             `;
//             contentDiv.appendChild(itemElement);
//         });
//     } else {
//         contentDiv.innerHTML = `<p>${data.message}</p>`;
//     }
// }

const routes = {
    '/home': '<h1>Welcome to the Home Page</h1>',
    '/register': 'src/components/register.html',
    '/login': 'src/components/login.html' // Correct path to login.html
};

const router = async () => {
    const content = document.getElementById('app');
    let request = location.hash.slice(1).toLowerCase() || '/home';
    let route = routes[request];

    if (route.endsWith('.html')) {
        const response = await fetch(route);
        const html = await response.text();
        content.innerHTML = html;
    } else {
        content.innerHTML = route;
    }

    // Re-attach event listeners after content is loaded
    attachEventListeners();
};

const attachEventListeners = () => {
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', async (event) => {
            event.preventDefault();

            const formData = new FormData(loginForm);
            const username = formData.get('username');
            const password = formData.get('password');

            const response = await fetch('http://localhost:80/api/login/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ username, password })
            });

            const data = await response.json();
            console.log(data);
        });
    }

    const login42 = document.getElementById('loginWith42');
    if (login42) {
        login42.addEventListener('click', async (event) => {
            event.preventDefault();

            const response = await fetch('http://localhost:80/api/oauth/login/');
            const data = await response.json();
            console.log(data);
        });
    }

    const registerForm = document.getElementById('registerForm');
    if (registerForm) {
        registerForm.addEventListener('submit', async (event) => {
            event.preventDefault();

            const formData = new FormData(registerForm);
            const username = formData.get('username');
            const password = formData.get('password');
            const email = formData.get('email');

            const response = await fetch('http://localhost:80/api/register/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ username, password, email })
            });

            const data = await response.json();
            console.log(data);
        });
    }
};

window.addEventListener('hashchange', router);
window.addEventListener('DOMContentLoaded', router);