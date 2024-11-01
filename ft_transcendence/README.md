# ft_transcendence

## Description
A real-time multiplayer Pong game with tournament functionality.

## Prerequisites
- Docker
- Docker Compose

## Setup
1. Clone the repository
2. Copy `.env.example` to `.env` and update the variables
3. Run `docker-compose up --build`

## Usage
- Frontend: http://localhost:3000
- Backend: http://localhost:8080
- Database: http://localhost:5432

## Features
- Real-time multiplayer Pong game
- Tournament system
- User authentication
- Secure websocket communication

## Development
```bash
# Start development environment
docker-compose up --build

# Stop environment
docker-compose down

# View logs
docker-compose logs -f
```

## Security
- HTTPS enabled
- Password hashing
- SQL injection protection
- XSS protection
