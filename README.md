# ft_transcendence 🎮✨

A full-stack, real-time web application developed as a capstone project at 42 Abu Dhabi. This multiplayer gaming platform combines social networking features with classic and AI-driven gameplay — all built with modern web technologies and a focus on performance, security, and user experience.

# Our Team 🎮✨

1- Me.
2- Mahmoud Abdelsalam.
3- Abdullah Salem.
4- Lakshmi.
---

## 🚀 Features

### 🕹️ Game Modes
- **Classic Pong** – Play 1v1 matches with real players or an AI opponent.
- **Tournament Mode** – Compete in 4 or 8-player brackets for the crown.
- **4-Player Pong** – Chaotic fun with 4 users in one arena.
- **3-Player Territory** – Paint the board; first to cover 50% wins.

### 💬 Real-Time Communication
- Live chat between users and friends.
- Online status indicators.
- WebSocket-based messaging system (via Daphne).

### 👥 Social Features
- User discovery with global and friend lists.
- Add/remove friends with live presence updates.
- Friend-specific messaging and challenge invites.

### 🔒 Security
- Secure backend with CSRF protection, input sanitization, and awareness of XSS/SQLi vulnerabilities.

---

## 🛠️ Tech Stack

| Layer        | Tools/Frameworks                                     |
|-------------|--------------------------------------------------------|
| **Frontend** | HTML5, CSS3, JavaScript (vanilla or framework-based)  |
| **Backend**  | Django, Django Channels, Daphne, REST Framework       |
| **Infra**    | Docker, Nginx, Makefile                               |
| **DB**       | PostgreSQL                                            |
| **Realtime** | WebSockets via ASGI / Daphne                          |

---

## 🧠 Architecture Highlights

- Modularized Django backend with API endpoints for authentication, user management, and gameplay logic.
- WebSockets powered by Daphne and Django Channels for smooth real-time updates.
- Dockerized development and deployment setup for consistency and scalability.
- Nginx reverse proxy configuration for production readiness.
- Automated backend bootstrapping using Makefile.

---

## 🏁 Getting Started

### Prerequisites
- Docker & Docker Compose
- Git

### Clone and Run
```bash
git clone https://github.com/alsaeed3/ft_transcendence.git
cd ft_transcendence
make up
