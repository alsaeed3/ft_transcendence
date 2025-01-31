# API Documentation

## Base URL
`https://localhost/api/`

## Authentication
The API uses JWT (JSON Web Token) authentication. Include the token in the Authorization header:
```
Authorization: Bearer <access_token>
```

## Authentication Endpoints

### Register New User
```http
POST /auth/register/
Content-Type: application/json

{
    "username": "string",
    "email": "string",
    "password": "string",
    "repeat_password": "string"
}
```

**Response** (201 Created):
```json
{
    "id": "integer",
    "username": "string",
    "email": "string",
    "display_name": "string",
    "avatar": "string|null",
    "user_id_42": "integer|null",
    "login_42": "string|null",
    "is_42_auth": "boolean"
}
```

### Login
```http
POST /auth/login/
Content-Type: application/json

{
    "username": "string",
    "password": "string"
}
```

**Response** (200 OK):
```json
{
    "refresh": "string",
    "access": "string",
    "user": {
        "id": "integer",
        "username": "string",
        "email": "string",
        "display_name": "string",
        "avatar": "string|null",
        "user_id_42": "integer|null",
        "login_42": "string|null",
        "is_42_auth": "boolean"
    }
}
```

### Logout
```http
POST /auth/logout/
Content-Type: application/json

{
    "refresh": "string"
}
```

**Response**: 205 Reset Content

### 42 OAuth Login
```http
GET /auth/oauth/login/
```
Redirects to 42 authorization page

### Refresh Token
```http
POST /token/refresh/
Content-Type: application/json

{
    "refresh": "string"
}
```

**Response** (200 OK):
```json
{
    "access": "string"
}
```

## User Endpoints

### List Users
```http
GET /users/
Authorization: Bearer <token>
```

**Response** (200 OK):
```json
[
    {
        "id": "integer",
        "username": "string",
        "display_name": "string",
        "avatar": "string|null",
        "online_status": "boolean",
        "language_preference": "string",
        "email": "string",
        "user_id_42": "integer|null",
        "login_42": "string|null",
        "is_42_auth": "boolean"
    }
]
```

### Get User Details
```http
GET /users/{id}/
Authorization: Bearer <token>
```

**Response** (200 OK):
```json
{
    "id": "integer",
    "username": "string",
    "display_name": "string",
    "avatar": "string|null",
    "online_status": "boolean",
    "language_preference": "string",
    "email": "string",
    "user_id_42": "integer|null",
    "login_42": "string|null",
    "is_42_auth": "boolean"
}
```

### Get Own Profile
```http
GET /users/profile/
Authorization: Bearer <token>
```

**Response** (200 OK):
```json
{
    "id": "integer",
    "username": "string",
    "display_name": "string",
    "avatar": "string|null",
    "online_status": "boolean",
    "language_preference": "string",
    "email": "string",
    "user_id_42": "integer|null",
    "login_42": "string|null",
    "is_42_auth": "boolean"
}
```

## Match Endpoints

### List Matches
```http
GET /matches/
Authorization: Bearer <token>
```

**Response** (200 OK):
```json
[
    {
        "id": "integer",
        "tournament": "integer|null",
        "player1": "integer",
        "player2": "integer",
        "player1_score": "integer",
        "player2_score": "integer",
        "start_time": "datetime",
        "end_time": "datetime|null",
        "winner": "integer|null"
    }
]
```

### Get Match Details
```http
GET /matches/{id}/
Authorization: Bearer <token>
```

**Response** (200 OK):
```json
{
    "id": "integer",
    "tournament": "integer|null",
    "player1": "integer",
    "player2": "integer",
    "player1_score": "integer",
    "player2_score": "integer",
    "start_time": "datetime",
    "end_time": "datetime|null",
    "winner": "integer|null"
}
```

## Tournament Endpoints

### List Tournaments
```http
GET /tournaments/
Authorization: Bearer <token>
```

**Response** (200 OK):
```json
[
    {
        "id": "integer",
        "name": "string",
        "participants": ["integer"],
        "start_time": "datetime",
        "status": "string",
        "current_round": "integer",
        "winner": "integer|null",
        "matches": [
            {
                "id": "integer",
                "round_number": "integer",
                "player1": "integer",
                "player2": "integer",
                "winner": "integer|null",
                "completed": "boolean"
            }
        ]
    }
]
```

### Create Tournament
```http
POST /tournaments/
Authorization: Bearer <token>
Content-Type: application/json

{
    "name": "string",
    "participants": ["integer"]
}
```

**Response** (201 Created):
```json
{
    "id": "integer",
    "name": "string",
    "participants": ["integer"],
    "start_time": "datetime",
    "status": "PENDING",
    "current_round": 1,
    "winner": null,
    "matches": []
}
```

### Get Tournament Details
```http
GET /tournaments/{id}/
Authorization: Bearer <token>
```

**Response** (200 OK):
```json
{
    "id": "integer",
    "name": "string",
    "participants": ["integer"],
    "start_time": "datetime",
    "status": "string",
    "current_round": "integer",
    "winner": "integer|null",
    "matches": [
        {
            "id": "integer",
            "round_number": "integer",
            "player1": "integer",
            "player2": "integer",
            "winner": "integer|null",
            "completed": "boolean"
        }
    ]
}
```

### Status Values
Tournament status can be one of:
- `PENDING`
- `ONGOING`
- `COMPLETED`

## Error Responses
All endpoints may return these error responses:

### 401 Unauthorized
```json
{
    "detail": "Authentication credentials were not provided."
}
```

### 403 Forbidden
```json
{
    "detail": "You do not have permission to perform this action."
}
```

### 404 Not Found
```json
{
    "detail": "Not found."
}
```

### 400 Bad Request
```json
{
    "field_name": ["error message"]
}
```
