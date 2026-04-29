# uFoundIt API Documentation (Postman Guide)

This document outlines the currently implemented API endpoints for the **uFoundIt** backend.

**Base URL**: `http://localhost:8000/api/`  
**Authentication**: JWT (Bearer Token)  
*Most endpoints require an `Authorization: Bearer <access_token>` header.*

---

## 1. Authentication Endpoints

| Endpoint | Method | Description | Body Parameters |
| :--- | :--- | :--- | :--- |
| `/auth/register/` | `POST` | Register a new user | `username` (optional), `email`, `password`, `password2`, `full_name`, `university_email` (optional), `campus_location` (optional) |
| `/auth/login/` | `POST` | Obtain JWT tokens | `username`, `password` |
| `/auth/refresh/` | `POST` | Refresh access token | `refresh` (the refresh token) |
| `/auth/logout/` | `POST` | Invalidate session | None (Requires Auth) |

---

## 2. User Profiles (`/profiles/`)

Endpoints for managing user profiles and viewing statistics.

| Endpoint | Method | Auth | Description | Parameters |
| :--- | :--- | :--- | :--- | :--- |
| `/profiles/` | `GET` | Yes | List public verified profiles | None |
| `/profiles/{id}/` | `GET` | Yes | Get specific profile | `id` (UUID) |
| `/profiles/me/` | `GET` | Yes | Get current user's profile | None |
| `/profiles/{id}/stats/` | `GET` | Yes | Get user statistics | `id` (UUID) |
| `/profiles/{id}/reputation/` | `GET` | Yes | Get reputation/verification info | `id` (UUID) |
| `/profiles/update_profile/` | `PATCH` | Yes | Update own profile | `full_name`, `phone_number`, `bio`, `campus_location` |
| `/profiles/upload_avatar/` | `PATCH` | Yes | Upload profile picture | `profile_picture` (file) |
| `/profiles/change_password/` | `POST` | Yes | Change account password | `old_password`, `new_password`, `new_password2` |

---

## 3. Items (`/items/`)

Core functionality for lost and found items.

| Endpoint | Method | Auth | Description | Parameters / Notes |
| :--- | :--- | :--- | :--- | :--- |
| `/items/` | `GET` | Yes | List items | **Filters**: `item_type` (lost/found), `status` (active/claimed/etc), `category` (UUID), `search` (keywords), `ordering` |
| `/items/` | `POST` | Yes | Create item listing | **Body (Multipart)**: `title`, `description`, `category` (UUID), `item_type`, `location_name`, `campus_area`, `date_found_lost`, `is_anonymous`, `verification_question`, `uploaded_images` (files) |
| `/items/{id}/` | `GET` | Yes | Get item details | `id` (UUID) |
| `/items/{id}/` | `PATCH`| Yes | Update item | `id` (UUID). Requires ownership. |
| `/items/{id}/` | `DELETE`| Yes | Delete item | `id` (UUID). Requires ownership. |

---

## 4. Item Categories (`/categories/`)

| Endpoint | Method | Auth | Description |
| :--- | :--- | :--- | :--- |
| `/categories/` | `GET` | Yes | List all categories |
| `/categories/{id}/` | `GET` | Yes | Get category details |

---

## 5. Claims (`/claims/`)

For claiming found items.

| Endpoint | Method | Auth | Description | Parameters |
| :--- | :--- | :--- | :--- | :--- |
| `/claims/` | `GET` | Yes | List my claims & claims on my items | None |
| `/claims/` | `POST` | Yes | Submit a new claim | `item` (UUID), `verification_description` |
| `/claims/{id}/approve/` | `POST` | Yes | Approve a claim | `id` (UUID). Only item poster can approve. |
| `/claims/{id}/reject/` | `POST` | Yes | Reject a claim | `id` (UUID). Only item poster can reject. |
| `/claims/{id}/resolve/` | `POST` | Yes | Resolve a claim | `id` (UUID). Only item poster can resolve. Awards reputation. |

---

## 6. Verification (`/verification/`)

| Endpoint | Method | Auth | Description |
| :--- | :--- | :--- | :--- |
| `/verification/{profile_id}/`| `GET` | Yes | Get verification status for profile |
| `/verification/my_status/` | `GET` | Yes | Get own verification status |

---

## Postman Tips

1.  **Set Environment Variables**: Create a variable for `{{baseUrl}}` and `{{accessToken}}`.
2.  **Bearer Token**: In the **Authorization** tab of a request or collection, select **Bearer Token** and use `{{accessToken}}`.
3.  **File Uploads**: For `POST /api/items/` and `PATCH /api/profiles/upload_avatar/`, use **Body > form-data**. For images, change the field type from 'Text' to '**File**'.
4.  **JSON Requests**: For other POST/PATCH requests, use **Body > raw > JSON**.
