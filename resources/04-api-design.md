# Nexel REST API Design Specification

This document details the REST API endpoints, payload contracts, validation structures, and HTTP statuses.

---

## 1. Authentication Endpoints

### 1.1 User Registration (`POST /api/auth/signup`)
Registers a new user and returns a token immediately to auto-login the user.

* **Request Body**:
```json
{
  "email": "student@university.edu",
  "password": "SecurePassword123"
}
```
* **Validation Rules**:
  * `email`: Must be a valid email structure, trimmed, and converted to lowercase.
  * `password`: String, minimum 6 characters.
* **Success Response (`201 Created`)**:
```json
{
  "message": "User registered successfully",
  "token": "eyJhbGciOiJIUzI1NiIsIn...",
  "user": {
    "id": "60d07eb41f92e412c823412a",
    "email": "student@university.edu"
  }
}
```
* **Failure Responses**:
  * `400 Bad Request`: Validation failure (e.g. invalid email format, password too short).
  * `409 Conflict`: Email address is already registered.

---

### 1.2 User Login (`POST /api/auth/login`)
Authenticates credentials and returns a JWT.

* **Request Body**:
```json
{
  "email": "student@university.edu",
  "password": "SecurePassword123"
}
```
* **Success Response (`200 OK`)**:
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsIn...",
  "user": {
    "id": "60d07eb41f92e412c823412a",
    "email": "student@university.edu"
  }
}
```
* **Failure Responses**:
  * `400 Bad Request`: Missing fields or validation errors.
  * `401 Unauthorized`: Invalid email or password combination.

---

### 1.3 Fetch Profile (`GET /api/auth/me`)
Retrieves the logged-in user's profile using the token provided in the Authorization header.

* **Headers**:
  * `Authorization`: `Bearer <token>`
* **Success Response (`200 OK`)**:
```json
{
  "user": {
    "id": "60d07eb41f92e412c823412a",
    "email": "student@university.edu"
  }
}
```
* **Failure Responses**:
  * `401 Unauthorized`: No token provided, invalid token, or expired token.

---

## 2. Standardized Error Payload Format
All errors returned by the API conform to the following schema to make client parsing reliable:

```json
{
  "error": {
    "message": "Human readable message describing the error detail.",
    "status": 400,
    "details": [
      {
        "field": "email",
        "message": "Invalid email address format."
      }
    ]
  }
}
```
* `error.message`: High-level error summary.
* `error.status`: Matches the HTTP Status code.
* `error.details` (Optional): Array containing validation error specifics per field.
