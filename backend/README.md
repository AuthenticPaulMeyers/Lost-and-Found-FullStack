# uFoundIt Backend - Django REST Framework

Campus Lost & Found Application Backend - Phase 1 Implementation Complete ✓

## Project Structure

```
backend/
├── config/                 # Django project configuration
│   ├── settings.py        # Main Django settings
│   ├── urls.py            # Root URL routing
│   ├── asgi.py            # ASGI for WebSockets/Channels
│   └── wsgi.py            # WSGI for production
├── api/                   # Main API routing
│   └── urls.py            # API endpoint routing
├── apps/
│   ├── users/            # User authentication & profiles [PHASE 1 ✓]
│   │   ├── models.py     # UserProfile, UserVerification
│   │   ├── serializers.py
│   │   ├── views.py
│   │   └── admin.py
│   ├── items/            # Item posting & management [PHASE 2]
│   ├── claims/           # Item claiming & verification [PHASE 3]
│   ├── chat/             # WebSocket messaging [PHASE 4]
│   └── notifications/    # Real-time alerts [PHASE 5]
├── tests/                 # Test suite
├── manage.py             # Django management command
├── requirements.txt      # Python dependencies
└── .env                  # Environment variables
```

## Phase 1: Core Infrastructure & Authentication ✓ COMPLETE

### Features Implemented

✓ **User Registration**
- Email validation
- University domain (.edu) verification
- Password strength validation
- Auto-creates UserProfile and UserVerification

✓ **JWT Authentication**
- Access & refresh tokens
- Token includes user profile info
- Simple and secure

✓ **User Profile Management**
- User statistics (items found/lost, successful claims)
- Reputation scoring
- Verification badge system
- Profile updates and avatar upload

✓ **Database Models**
- UserProfile - Extended user with reputation tracking
- UserVerification - Email and domain verification status
- UserFollowing - Trust/follow system (placeholder)

✓ **API Endpoints**
```
POST   /api/auth/register/              Register new user
POST   /api/auth/login/                 Login (get JWT tokens)
POST   /api/auth/refresh/               Refresh access token
POST   /api/auth/logout/                Logout

GET    /api/profiles/me/                Get current user profile
GET    /api/profiles/<id>/              Get user profile by ID
PATCH  /api/profiles/update_profile/    Update profile
PATCH  /api/profiles/upload_avatar/     Upload profile picture
POST   /api/profiles/change_password/   Change password
GET    /api/profiles/<id>/stats/        Get user statistics
GET    /api/profiles/<id>/reputation/   Get reputation badge

GET    /api/verification/<id>/          Get verification status
GET    /api/verification/my_status/     Get my verification status
```

✓ **Admin Interface**
- Full admin panel for managing users, profiles, verification status

✓ **Security**
- CORS configuration for frontend
- JWT authentication with refresh token rotation
- Password validation
- Protected endpoints

✓ **Testing**
- Comprehensive test suite (20+ test cases)
- Registration, login, token refresh tests
- Profile management tests
- Permission and authentication tests
- Model method tests

## Quick Start

### 1. Install Dependencies

```bash
# Windows
python -m pip install -r requirements.txt

# macOS/Linux
pip install -r requirements.txt
```

### 2. Setup Environment

Copy `.env.example` to `.env` and configure:

```bash
cp .env.example .env
```

Default `.env` already configured for development (SQLite, in-memory Channels).

### 3. Create Database & Run Migrations

```bash
python manage.py makemigrations
python manage.py migrate
```

### 4. Create Superuser (Admin)

```bash
python manage.py createsuperuser
```

### 5. Load Initial Data (Optional)

```bash
python manage.py shell
>>> from apps.items.models import ItemCategory
>>> categories = ['Electronics', 'Keys', 'Clothing', 'Accessories', 'Documents', 'Sports Equipment', 'Personal Items', 'Other']
>>> for cat in categories:
...     ItemCategory.objects.create(name=cat)
```

### 6. Run Development Server

```bash
python manage.py runserver
```

Access:
- API: http://localhost:8000/api/
- Admin: http://localhost:8000/admin/
- API Docs: http://localhost:8000/api/docs/
- ReDoc: http://localhost:8000/api/redoc/

## Testing

Run all tests:

```bash
pytest
```

Run specific test file:

```bash
pytest tests/test_auth.py
```

Run with coverage:

```bash
pytest --cov=apps
```

Specific test:

```bash
pytest tests/test_auth.py::UserRegistrationTests::test_register_new_user_success
```

## API Usage Examples

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

### 2. Login

```bash
curl -X POST http://localhost:8000/api/auth/login/ \
  -H "Content-Type: application/json" \
  -d '{
    "username": "john_doe",
    "password": "SecurePass123!"
  }'
```

Returns:
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

### 3. Get User Profile (Authenticated)

```bash
curl -X GET http://localhost:8000/api/profiles/me/ \
  -H "Authorization: Bearer <access_token>"
```

### 4. Update Profile

```bash
curl -X PATCH http://localhost:8000/api/profiles/update_profile/ \
  -H "Authorization: Bearer <access_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "full_name": "John Updated",
    "bio": "Campus lost and found helper",
    "campus_location": "Student Union"
  }'
```

## Configuration

### Database

**Development (Default)**: SQLite (no setup needed)

**Production**: PostgreSQL
```python
# In settings.py, uncomment PostgreSQL section and set environment variables:
DB_NAME=ufoundit
DB_USER=postgres
DB_PASSWORD=your_password
DB_HOST=localhost
DB_PORT=5432
```

### Django Channels (WebSockets)

**Development (Default)**: In-memory (USE_IN_MEMORY_CHANNELS=True)

**Production**: Redis
```bash
# Install Redis
# macOS:
brew install redis
redis-server

# Then set in .env:
USE_IN_MEMORY_CHANNELS=False
REDIS_HOST=localhost
REDIS_PORT=6379
```

### AWS S3 (File Storage)

To enable S3 storage:

```env
USE_S3=True
AWS_ACCESS_KEY_ID=your_key
AWS_SECRET_ACCESS_KEY=your_secret
AWS_STORAGE_BUCKET_NAME=your_bucket_name
AWS_S3_REGION_NAME=us-east-1
```

## Project Features by Phase

### Phase 1: Core Infrastructure & Authentication ✓
- User registration & JWT login
- User profiles with reputation tracking
- Admin interface
- Email & domain verification system
- Password management

### Phase 2: Item Management & Search (Coming)
- Post lost/found items with images
- Search and filtering
- Item detail views
- Image upload to S3

### Phase 3: Claiming & Verification (Coming)
- Claim items with Q&A verification
- Item status workflow
- Reputation badge system

### Phase 4: Real-time Chat (Coming)
- WebSocket chat between users
- Message history
- Read status tracking

### Phase 5: Real-time Notifications (Coming)
- WebSocket notifications
- Notification management
- Alert customization

## Important Files Reference

| File | Purpose |
|------|---------|
| `config/settings.py` | Django configuration - centralizes all settings |
| `config/asgi.py` | WebSocket configuration for Django Channels |
| `apps/users/models.py` | UserProfile & verification models |
| `apps/users/serializers.py` | JWT & registration serializers |
| `apps/users/views.py` | Authentication & profile views |
| `api/urls.py` | Main API routing |
| `tests/test_auth.py` | Comprehensive authentication tests |

## Common Commands

```bash
# Create migrations for model changes
python manage.py makemigrations

# Apply migrations to database
python manage.py migrate

# Run development server
python manage.py runserver

# Create superuser for admin
python manage.py createsuperuser

# Enter Django shell
python manage.py shell

# Collect static files for production
python manage.py collectstatic

# Run tests
pytest

# Run tests with coverage
pytest --cov=apps

# Format code
black .

# Check code quality
flake8 .

# Sort imports
isort .
```

## Deployment

For production deployment:

1. Set `DEBUG=False` in `.env`
2. Set strong `SECRET_KEY`
3. Configure `ALLOWED_HOSTS`
4. Setup PostgreSQL database
5. Setup Redis for Channels
6. Configure AWS S3 bucket
7. Setup email backend
8. Run migrations
9. Collect static files
10. Serve with Daphne/Gunicorn + Nginx

Example Docker setup ready in next phases.

## Troubleshooting

**"No module named 'apps'"**
- Ensure you're in the `backend/` directory
- Run: `python manage.py runserver`

**"django.db.utils.OperationalError: no such table"**
- Run: `python manage.py migrate`

**CORS errors in frontend**
- Update `CORS_ALLOWED_ORIGINS` in `.env`

**JWT token not working**
- Check token expiration (15 min default access token)
- Use refresh token to get new access token
- Ensure Authorization header format: `Authorization: Bearer <token>`

## Support

For issues or questions:
1. Check the test suite in `tests/test_auth.py`
2. Review API endpoint examples above
3. Check settings.py for configuration options
4. Review plan file: `floofy-toasting-steele.md`
