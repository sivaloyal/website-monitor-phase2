Deploying to Render

1) Pre-reqs
- You need a Render account (https://render.com)
- Connect your GitHub/GitLab account and grant repo access

2) What we will create
- `website-monitor-backend` (Node web service) running the Express backend on port 5000
- `website-monitor-frontend` (Static site) serving the React build from `node-website-monitor/frontend/build`

3) Steps
- Push your repo to GitHub (already done)
- On Render, click "New" -> "Web Service" and select the repo
  - Set the branch to `main`
  - For `Build Command`, use: `cd node-website-monitor/backend && npm install`
  - For `Start Command`, use: `cd node-website-monitor/backend && npm start`
  - Set `PORT` to `5000` in Environment -> Environment Variables
  - Add any other environment variables from your local `.env` (e.g., `MONGODB_URI`, `DEFAULT_MONITOR_URL`, `SENTRY_DSN`)

- Next, click "New" -> "Static Site" to deploy the frontend
  - Select the same repo and branch
  - For `Build Command` use: `cd node-website-monitor/frontend && npm install && npm run build`
  - For `Publish Directory` enter: `node-website-monitor/frontend/build`

4) Notes
- The frontend built assets will be served from Render's static site. The frontend uses `/api` relative paths, so on Render you must set the `API_BASE` to the backend URL if not using the same domain.
- If you prefer both backend and frontend on the same domain, you can deploy the backend web service and set the backend to serve the built frontend (we already have code in `backend/src/app.js` that will serve `frontend/build` when present). In this case you can deploy only the web service and add a `postinstall` script to build the frontend during the backend build.

5) Optional: build frontend during backend deploy
- Edit `node-website-monitor/backend/package.json` to include a `postinstall` script:

  "scripts": {
    "start": "node src/app.js",
    "dev": "nodemon src/app.js",
    "postinstall": "cd .. && cd frontend && npm install && npm run build && cd ../backend"
  }

This will cause Render to build the frontend during the backend build and then the backend's static serving will provide the UI at the backend URL.

6) After deploy
- Visit the backend URL Render provides (e.g., `https://website-monitor-backend.onrender.com`) — if you used the combined backend build approach, the UI will be served from that URL. Otherwise, visit the static site URL for the frontend and ensure the API base is correctly set.

7) Environment variables to set on Render
- `MONGODB_URI` (required for DB)
- `DEFAULT_MONITOR_URL` (optional)
- `NODE_ENV=production`
- `PORT=5000` (for backend)

If you'd like, I can:
- Add the `postinstall` script to the backend `package.json` for you and commit it
- Create a Render `render.yaml` with your actual GitHub repo URL (replace placeholder)
