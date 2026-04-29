"""
Tests for User Authentication and Profile Management
Phase 1 - Core Infrastructure & Authentication
"""

import pytest
from django.test import TestCase
from django.contrib.auth.models import User
from rest_framework.test import APIClient, APITestCase
from rest_framework import status
from apps.users.models import UserProfile, UserVerification


class UserRegistrationTests(APITestCase):
    """Tests for user registration endpoint"""

    def setUp(self):
        self.client = APIClient()
        self.register_url = '/api/auth/register/'

    def test_register_new_user_success(self):
        """Test successful user registration"""
        data = {
            'username': 'testuser',
            'email': 'test@example.com',
            'password': 'TestPass123!@#',
            'password2': 'TestPass123!@#',
            'full_name': 'Test User',
            'university_email': 'test@university.edu',
            'campus_location': 'Main Library'
        }
        response = self.client.post(self.register_url, data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn('user_id', response.data)
        self.assertEqual(response.data['username'], 'testuser')

    def test_register_password_mismatch(self):
        """Test registration fails with mismatched passwords"""
        data = {
            'username': 'testuser',
            'email': 'test@example.com',
            'password': 'TestPass123!@#',
            'password2': 'DifferentPass123!@#',
            'full_name': 'Test User',
            'university_email': 'test@university.edu',
        }
        response = self.client.post(self.register_url, data)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('password', response.data)

    def test_register_non_edu_email(self):
        """Test registration fails with non-.edu email"""
        data = {
            'username': 'testuser',
            'email': 'test@example.com',
            'password': 'TestPass123!@#',
            'password2': 'TestPass123!@#',
            'full_name': 'Test User',
            'university_email': 'test@gmail.com',
        }
        response = self.client.post(self.register_url, data)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('university_email', response.data)

    def test_register_weak_password(self):
        """Test registration fails with weak password"""
        data = {
            'username': 'testuser',
            'email': 'test@example.com',
            'password': '123',  # Too short
            'password2': '123',
            'full_name': 'Test User',
            'university_email': 'test@university.edu',
        }
        response = self.client.post(self.register_url, data)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_register_creates_user_profile(self):
        """Test that registration creates UserProfile and UserVerification"""
        data = {
            'username': 'testuser',
            'email': 'test@example.com',
            'password': 'TestPass123!@#',
            'password2': 'TestPass123!@#',
            'full_name': 'Test User',
            'university_email': 'test@university.edu',
        }
        self.client.post(self.register_url, data)

        # Check user was created
        user = User.objects.get(username='testuser')
        self.assertEqual(user.email, 'test@example.com')

        # Check profile was created
        profile = UserProfile.objects.get(user=user)
        self.assertEqual(profile.full_name, 'Test User')
        self.assertEqual(profile.university_email, 'test@university.edu')

        # Check verification was created
        verification = UserVerification.objects.get(user_profile=profile)
        self.assertIsNotNone(verification)
        self.assertFalse(verification.email_verified)


class UserLoginTests(APITestCase):
    """Tests for JWT login endpoint"""

    def setUp(self):
        self.client = APIClient()
        self.login_url = '/api/auth/login/'
        self.register_url = '/api/auth/register/'

        # Create test user
        register_data = {
            'username': 'testuser',
            'email': 'test@example.com',
            'password': 'TestPass123!@#',
            'password2': 'TestPass123!@#',
            'full_name': 'Test User',
            'university_email': 'test@university.edu',
        }
        self.client.post(self.register_url, register_data)

    def test_login_success(self):
        """Test successful login returns JWT tokens"""
        data = {
            'username': 'testuser',
            'password': 'TestPass123!@#'
        }
        response = self.client.post(self.login_url, data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('access', response.data)
        self.assertIn('refresh', response.data)
        self.assertIn('user', response.data)
        self.assertEqual(response.data['user']['username'], 'testuser')

    def test_login_invalid_credentials(self):
        """Test login fails with invalid credentials"""
        data = {
            'username': 'testuser',
            'password': 'WrongPassword123!@#'
        }
        response = self.client.post(self.login_url, data)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_login_nonexistent_user(self):
        """Test login fails for nonexistent user"""
        data = {
            'username': 'nonexistent',
            'password': 'TestPass123!@#'
        }
        response = self.client.post(self.login_url, data)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


class TokenRefreshTests(APITestCase):
    """Tests for JWT token refresh endpoint"""

    def setUp(self):
        self.client = APIClient()
        self.register_url = '/api/auth/register/'
        self.login_url = '/api/auth/login/'
        self.refresh_url = '/api/auth/refresh/'

        # Create and login test user
        register_data = {
            'username': 'testuser',
            'email': 'test@example.com',
            'password': 'TestPass123!@#',
            'password2': 'TestPass123!@#',
            'full_name': 'Test User',
            'university_email': 'test@university.edu',
        }
        self.client.post(self.register_url, register_data)

        login_response = self.client.post(self.login_url, {
            'username': 'testuser',
            'password': 'TestPass123!@#'
        })
        self.refresh_token = login_response.data['refresh']

    def test_refresh_token_success(self):
        """Test successful token refresh"""
        data = {'refresh': self.refresh_token}
        response = self.client.post(self.refresh_url, data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('access', response.data)

    def test_refresh_invalid_token(self):
        """Test refresh fails with invalid token"""
        data = {'refresh': 'invalid-token'}
        response = self.client.post(self.refresh_url, data)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


class UserProfileTests(APITestCase):
    """Tests for user profile endpoints"""

    def setUp(self):
        self.client = APIClient()
        self.register_url = '/api/auth/register/'
        self.login_url = '/api/auth/login/'

        # Create and login test user
        register_data = {
            'username': 'testuser',
            'email': 'test@example.com',
            'password': 'TestPass123!@#',
            'password2': 'TestPass123!@#',
            'full_name': 'Test User',
            'university_email': 'test@university.edu',
            'campus_location': 'Main Library'
        }
        self.client.post(self.register_url, register_data)

        login_response = self.client.post(self.login_url, {
            'username': 'testuser',
            'password': 'TestPass123!@#'
        })
        self.access_token = login_response.data['access']
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.access_token}')
        self.user_id = login_response.data['user']['id']

    def test_get_my_profile(self):
        """Test getting current user's profile"""
        response = self.client.get('/api/profiles/me/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['full_name'], 'Test User')
        self.assertEqual(response.data['university_email'], 'test@university.edu')

    def test_get_profile_by_id(self):
        """Test getting another user's profile"""
        response = self.client.get(f'/api/profiles/{self.user_id}/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['full_name'], 'Test User')

    def test_get_profile_stats(self):
        """Test getting user statistics"""
        response = self.client.get(f'/api/profiles/{self.user_id}/stats/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['total_items_found'], 0)
        self.assertEqual(response.data['total_items_lost'], 0)
        self.assertEqual(response.data['total_successful_claims'], 0)
        self.assertIn('reputation_level', response.data)

    def test_get_profile_reputation(self):
        """Test getting user reputation"""
        response = self.client.get(f'/api/profiles/{self.user_id}/reputation/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('reputation_score', response.data)
        self.assertIn('reputation_level', response.data)
        self.assertFalse(response.data['verification_badge_eligible'])

    def test_update_profile(self):
        """Test updating user profile"""
        update_data = {
            'full_name': 'Updated Name',
            'bio': 'New bio text',
            'campus_location': 'Student Union'
        }
        response = self.client.patch('/api/profiles/update_profile/', update_data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['full_name'], 'Updated Name')
        self.assertEqual(response.data['bio'], 'New bio text')

    def test_change_password(self):
        """Test changing user password"""
        data = {
            'old_password': 'TestPass123!@#',
            'new_password': 'NewPass456!@#',
            'new_password2': 'NewPass456!@#'
        }
        response = self.client.post('/api/profiles/change_password/', data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # Try logging in with new password
        self.client.credentials()  # Clear auth
        login_response = self.client.post(self.login_url, {
            'username': 'testuser',
            'password': 'NewPass456!@#'
        })
        self.assertEqual(login_response.status_code, status.HTTP_200_OK)

    def test_change_password_old_password_wrong(self):
        """Test changing password fails with wrong old password"""
        data = {
            'old_password': 'WrongPassword',
            'new_password': 'NewPass456!@#',
            'new_password2': 'NewPass456!@#'
        }
        response = self.client.post('/api/profiles/change_password/', data)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


class ProtectedEndpointsTests(APITestCase):
    """Tests for protected endpoints requiring authentication"""

    def setUp(self):
        self.client = APIClient()

    def test_profile_endpoints_require_auth(self):
        """Test that profile endpoints require authentication"""
        response = self.client.get('/api/profiles/me/')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_change_password_requires_auth(self):
        """Test that change password requires authentication"""
        response = self.client.post('/api/profiles/change_password/', {})
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_logout_requires_auth(self):
        """Test that logout requires authentication"""
        response = self.client.post('/api/auth/logout/')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


class UserProfileModelTests(TestCase):
    """Tests for UserProfile model methods"""

    def setUp(self):
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        self.profile = UserProfile.objects.create(
            user=self.user,
            full_name='Test User',
            university_email='test@university.edu'
        )

    def test_get_reputation_level_new(self):
        """Test reputation level for new user"""
        self.profile.reputation_score = 20
        level = self.profile.get_reputation_level()
        self.assertEqual(level, 'New')

    def test_get_reputation_level_fair(self):
        """Test reputation level at fair range"""
        self.profile.reputation_score = 50
        level = self.profile.get_reputation_level()
        self.assertEqual(level, 'Fair')

    def test_get_reputation_level_good(self):
        """Test reputation level at good range"""
        self.profile.reputation_score = 75
        level = self.profile.get_reputation_level()
        self.assertEqual(level, 'Good')

    def test_get_reputation_level_excellent(self):
        """Test reputation level at excellent range"""
        self.profile.reputation_score = 90
        level = self.profile.get_reputation_level()
        self.assertEqual(level, 'Excellent')

    def test_award_verification_badge(self):
        """Test verification badge awarded at 3 successful claims"""
        self.profile.total_successful_claims = 2
        self.assertFalse(self.profile.verification_badge_eligible)

        self.profile.total_successful_claims = 3
        self.profile.award_verification_badge()
        self.assertTrue(self.profile.verification_badge_eligible)

    def test_increment_successful_claims(self):
        """Test incrementing successful claims"""
        initial_count = self.profile.total_successful_claims
        self.profile.increment_successful_claims()
        self.profile.refresh_from_db()
        self.assertEqual(self.profile.total_successful_claims, initial_count + 1)

    def test_string_representation(self):
        """Test UserProfile string representation"""
        expected = f"{self.profile.full_name} (@{self.user.username})"
        self.assertEqual(str(self.profile), expected)
