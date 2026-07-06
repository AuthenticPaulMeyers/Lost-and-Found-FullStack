# UFoundIt FullStack System

### UFoundIt is a campus-style Lost & Found application. 

UFoundIt increases the recovery rate of misplaced items by replacing disorganized paper ledgers and scattered social media posts with a searchable, centralized hub. It slashes stress for students and staff, streamlines administrative workloads, and fosters a collaborative community atmosphere.

## Overview

- Backend: Django + Django REST Framework, Channels for WebSockets, Daphne as ASGI server.
- Frontend: Vite + vanilla JS (small SPA in `frontend/`) that communicates with the backend via REST and native WebSockets.
- Purpose: allow users to post lost/found items, message each other in real time, and manage conversations with delivery/read receipts.

## Architecture

- `backend/` — Django project containing APIs, models, Channels consumers, and WebSocket routing.

- `frontend/` — Vite app with small UI components.

## Tech stack

- Python 3.11+ (dev tested on 3.14)
- Django
- Django REST Framework
- Django Channels
- Daphne (ASGI server)
- SQLite (development DB)
- Vite + vanilla JavaScript + Tailwind

## Chat features implemented

- Persistent conversations and messages stored in the DB.
- WebSocket consumer with per-user groups to avoid echoing sender messages and to target delivery receipts to original senders.
- Presence broadcast (online/offline) and delivery / seen acknowledgements.

## Running locally (development)

1. Create and activate a Python environment and install backend requirements:

```powershell
cd backend
python -m pip install -r requirements.txt
```

2. Apply migrations and run Daphne ASGI server:

```powershell
python manage.py migrate
python -m daphne -b 0.0.0.0 -p 8000 config.asgi:application
```

3. Start the frontend dev server (in a separate terminal):

```powershell
cd frontend
npm install
npm run dev
```

4. Open the frontend URL (Vite default) in two browser windows to test chat flows.

## Next steps / Roadmap

- Replace SQLite with Postgres for production and configure a channel layer backend (Redis).

## License

MIT

