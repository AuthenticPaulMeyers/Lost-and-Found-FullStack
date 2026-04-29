# Phase 1 - Quick Start Guide

## Installation (5 minutes)

### 1. Install Dependencies

```bash
cd backend

# Install requirements
python -m pip install -r requirements.txt
```

### 2. Create Database

```bash
python manage.py migrate
```

### 3. Create Admin User (optional - for /admin access)

```bash
python manage.py createsuperuser
```

### 4. Run Development Server

```bash
python manage.py runserver
```

Server runs at: `http://localhost:8000`

---

## Test the API (via curl or Postman)

### 1. Register New User

```bash
curl -X POST http://localhost:8000/api/auth/register/ \
  -H "Content-Type: application/json" \
  -d '{
    "username": "john_doe",
    "email": "john@example.com",
    "password": "SecurePass123!",
    "password2": "SecurePass123!",
    "full_name": "John Doe",
    "university_email": "john@university.edu",
    "campus_location": "Main Library"
  }'
```

**Response:**
```json
{
  "message": "User registered successfully",
  "user_id": "uuid-string",
  "username": "john_doe"
}
```

### 2. Login (Get JWT Tokens)

```bash
curl -X POST http://localhost:8000/api/auth/login/ \
  -H "Content-Type: application/json" \
  -d '{
    "username": "john_doe",
    "password": "SecurePass123!"
  }'
```

**Response:**
```json
{
  "access": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "refresh": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "user": {
    "id": "uuid",
    "username": "john_doe",
    "email": "john@example.com",
    "full_name": "John Doe",
    "is_verified": false,
    "verification_badge_eligible": false
  }
}
```

**Save the `access` token** - you'll use it for protected endpoints.

### 3. Get User Profile (Authenticated)

```bash
# Replace TOKEN with the access token from login response
curl -X GET http://localhost:8000/api/profiles/me/ \
  -H "Authorization: Bearer TOKEN"
```

**Response:**
```json
{
  "id": "uuid",
  "user": {
    "id": 1,
    "username": "john_doe",
    "email": "john@example.com"
  },
  "full_name": "John Doe",
  "phone_number": "",
  "university_email": "john@university.edu",
  "profile_picture": null,
  "bio": "",
  "is_verified": false,
  "reputation_score": 0,
  "reputation_level": "New",
  "total_items_found": 0,
  "total_items_lost": 0,
  "total_successful_claims": 0,
  "verification_badge_eligible": false,
  "campus_location": "Main Library",
  "created_at": "2024-01-15T12:34:56Z",
  "updated_at": "2024-01-15T12:34:56Z",
  "last_active": null
}
```

### 4. Update Profile

```bash
curl -X PATCH http://localhost:8000/api/profiles/update_profile/ \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "full_name": "John Updated",
    "bio": "Campus lost and found helper",
    "campus_location": "Student Union"
  }'
```

### 5. Change Password

```bash
curl -X POST http://localhost:8000/api/profiles/change_password/ \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "old_password": "SecurePass123!",
    "new_password": "NewPass456!",
    "new_password2": "NewPass456!"
  }'
```

### 6. Refresh Token (Get New Access Token)

```bash
curl -X POST http://localhost:8000/api/auth/refresh/ \
  -H "Content-Type: application/json" \
  -d '{
    "refresh": "REFRESH_TOKEN_HERE"
  }'
```

### 7. Admin Panel

Go to: `http://localhost:8000/admin/`
- Login with superuser credentials
- Manage users and profiles

---

## API Endpoints Reference

### Authentication (No auth required)
```
POST   /api/auth/register/      - Register new user
POST   /api/auth/login/         - Login (get JWT tokens)
POST   /api/auth/refresh/       - Refresh access token
POST   /api/auth/logout/        - Logout
```

### User Profiles (Auth required)
```
GET    /api/profiles/me/                  - Get your profile
GET    /api/profiles/<id>/                - Get user profile
GET    /api/profiles/<id>/stats/          - Get user stats
GET    /api/profiles/<id>/reputation/     - Get reputation status
PATCH  /api/profiles/update_profile/      - Update profile
PATCH  /api/profiles/upload_avatar/       - Upload avatar
POST   /api/profiles/change_password/     - Change password
```

### Verification (Auth required)
```
GET    /api/verification/<id>/            - Get verification status
GET    /api/verification/my_status/       - Get my verification
```

---

## Run Tests

```bash
# Run all tests
pytest

# Run specific test file
pytest tests/test_auth.py

# Run with coverage report
pytest --cov=apps
```

---

## Common Issues & Solutions

### Issue: "Module not found" errors
**Solution:** Ensure you're in the `backend/` directory and requirements installed
```bash
cd backend
python -m pip install -r requirements.txt
```

### Issue: Database error
**Solution:** Run migrations
```bash
python manage.py migrate
```

### Issue: Port 8000 already in use
**Solution:** Use different port
```bash
python manage.py runserver 8001
```

### Issue: JWT token expired
**Solution:** Use refresh token to get new access token
```bash
curl -X POST http://localhost:8000/api/auth/refresh/ \
  -H "Content-Type: application/json" \
  -d '{"refresh": "YOUR_REFRESH_TOKEN"}'
```

### Issue: CORS error in frontend
**Solution:** Update CORS_ALLOWED_ORIGINS in `.env`
```
CORS_ALLOWED_ORIGINS=http://localhost:3000,http://localhost:8000
```

---

## Environment Configuration

Edit `.env` file:

```env
# Django
DEBUG=True
SECRET_KEY=dev-key-change-in-production
ALLOWED_HOSTS=localhost,127.0.0.1

# CORS (for frontend)
CORS_ALLOWED_ORIGINS=http://localhost:3000,http://localhost:8000

# Email (console output in development)
EMAIL_BACKEND=django.core.mail.backends.console.EmailBackend

# Logging
DJANGO_LOG_LEVEL=INFO
```

---

## What's Working

✓ User registration with .edu email validation
✓ JWT authentication (access + refresh tokens)
✓ User profiles with statistics
✓ Reputation system
✓ Profile updates and password changes
✓ Admin interface
✓ Comprehensive tests

---

## What's Ready for Next Phases

**Phase 2 - Item Management:** Models created, ready to add CRUD endpoints
**Phase 3 - Claiming System:** Model created, ready to implement workflow
**Phase 4 - Real-time Chat:** WebSocket routing configured, ready for consumers
**Phase 5 - Notifications:** Model created, ready for WebSocket implementation

---

## Next Steps

1. ✓ Phase 1 working (authentication, profiles)
2. → Integrate with your frontend templates
3. → Implement Phase 2 (item posting and search)
4. → Add Phase 3 (claiming system)
5. → Enable real-time features (chat, notifications)

---

## Support References

- Full documentation: `README.md`
- Test examples: `tests/test_auth.py`
- Settings reference: `config/settings.py`
- Plan document: `../floofy-toasting-steele.md`
