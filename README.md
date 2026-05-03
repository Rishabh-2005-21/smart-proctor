# Smart Proctor

Smart Proctor is a full-stack exam and interview preparation platform with:

- role-based student and teacher workspaces
- AI-assisted quiz generation, coding practice, and interview chat
- personalized roadmap planning
- analytics dashboards and live proctor alerts

## Project structure

- `client/` - Vite + React frontend
- `server/` - Express + MongoDB backend
- `tests/` - API/socket/load test stubs

## Run locally

1. Install dependencies inside both `client/` and `server/`.
2. Start the backend:

```bash
npm run dev:server
```

3. Start the frontend in a second terminal:

```bash
npm run dev:client
```

The frontend expects the API at `http://localhost:5000` by default.

## Environment

Create a `server/.env` file with at least:

```env
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
OPENAI_API_KEY=optional
GROQ_API_KEY=optional
PORT=5000
```

## Key improvements now included

- centralized auth/session handling on the frontend
- protected role-based routes with lazy-loaded pages
- personalized roadmap generation and suggested focus tests
- unified Socket.IO server for live proctor monitoring
- indexed Mongo collections and lighter analytics/history reads
