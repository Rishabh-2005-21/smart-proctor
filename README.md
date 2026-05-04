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

For frontend local env, create `client/.env`:

```env
VITE_API_URL=http://localhost:5000
VITE_SOCKET_URL=http://localhost:5000
```

## Free production deploy (Render + Vercel)

1. Deploy backend (Render):
   - Create a new **Web Service** from this repository.
   - Render will read `render.yaml` automatically (or configure manually with `rootDir=server`, `buildCommand=npm install`, `startCommand=npm start`).
   - Add environment variables from `server/.env.example`.

2. Deploy frontend (Vercel):
   - Import this repository in Vercel.
   - Set **Root Directory** to `client`.
   - Build command: `npm run build`
   - Output directory: `dist`
   - Add environment variables from `client/.env.example`, replacing `your-render-service` with your real Render backend URL.

3. Redeploy frontend after backend URL is known:
   - After Render gives your live API URL, update:
     - `VITE_API_URL`
     - `VITE_SOCKET_URL`
   - Trigger a Vercel redeploy.

## Key improvements now included

- centralized auth/session handling on the frontend
- protected role-based routes with lazy-loaded pages
- personalized roadmap generation and suggested focus tests
- unified Socket.IO server for live proctor monitoring
- indexed Mongo collections and lighter analytics/history reads
