// src/assets/js/modules/auth.js
import { registerUser, loginUser } from '/assets/js/modules/api.js';

export const setupRegistrationForm = () => {
    const form = document.getElementById('registerForm');
    if (form) {
        form.addEventListener('submit', async (event) => {
            event.preventDefault();
            const formData = {
                username: form.username.value,
                email: form.email.value,
                password: form.password.value,
                repeat_password: form['repeat-password'].value,
            };
            const data = await registerUser(formData);
            if (data.message) {
                alert(data.message);
                window.location.hash = '#/login';
            } else {
                alert('Registration failed: ' + JSON.stringify(data));
            }
        });
    }
};

export const setupLoginForm = () => {
    const form = document.getElementById('loginForm');
    if (form) {
        form.addEventListener('submit', async (event) => {
            event.preventDefault();
            const formData = {
                username: form.username.value,
                password: form.password.value,
            };
            const data = await loginUser(formData);
            if (data.access) {
                localStorage.setItem('accessToken', data.access);
                localStorage.setItem('refreshToken', data.refresh);
                window.location.hash = '#/';
            } else {
                alert('Login failed: ' + JSON.stringify(data));
            }
        });
    }
};