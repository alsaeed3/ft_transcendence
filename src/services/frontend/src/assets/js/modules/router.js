export const router = {
    routes: {},
    addRoute(route, callback) {
        this.routes[route] = callback;
    },
    navigate() {
        const hash = window.location.hash || '#/';
        const route = this.routes[hash];
        if (route) {
            route();
        } else {
            this.routes['#/'](); // Default route
        }
    },
    init() {
        window.addEventListener('hashchange', this.navigate.bind(this));
        this.navigate();
    },
};