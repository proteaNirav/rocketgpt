# RocketGPT Core API — Online Deploy

This folder lets you deploy the FastAPI stub **online** without touching local Python.

## Option A — Render (Free)

1. Create a new **Web Service** on Render.
2. Connect to a GitHub repo **or** upload this folder as a **Blueprint**.
   - If using Blueprint: copy `render.yaml` to your repo root.
3. Render will auto-detect Python.
   - **Build Command:** `pip install -r requirements.txt`
   - **Start Command:** `uvicorn server_stub_fastapi:app --host 0.0.0.0 --port $PORT`
4. Once live, test:
   - `POST https://<your-app>.onrender.com/plan`
   - `POST https://<your-app>.onrender.com/recommend`
   - `POST https://<your-app>.onrender.com/estimate`

## Option B — Railway (Free tier)

1. Create a new project → **Deploy from Repo** (or **+ New** → **Empty Project** and upload files).
2. Railway will run `pip install -r requirements.txt`.
3. Set **Start Command** to `uvicorn server_stub_fastapi:app --host 0.0.0.0 --port $PORT`.
4. Open the generated domain and hit the endpoints above.

## Option C — Docker Anywhere (Fly.io, VM, K8s, etc.)

```bash
docker build -t rocketgpt-core-api .
docker run -p 8080:8080 rocketgpt-core-api
# Test locally: http://127.0.0.1:8080/docs
```

For **Fly.io**:
```bash
flyctl launch --no-deploy
# set internal port to 8080 when prompted
flyctl deploy
```

## Option D — Hugging Face Spaces (Docker)

1. Create a new **Space** → **Docker** runtime.
2. Upload `Dockerfile`, `requirements.txt`, and `server_stub_fastapi.py`.
3. The Space URL will expose the API on port 7860 by default; our image uses 8080, which HF maps automatically. If needed, set `PORT=7860` in the Space settings or edit `Dockerfile` to use `7860`.

---

### Health Check
After deployment, open `/docs` to see Swagger UI.  
Example: `https://<your-app>/docs`

### Environment Variables
Not required for the stub. Add secrets later as needed.

### Next Steps
- Point the Phase‑2 UI shell (Next.js) to your deployed URL.
- When you switch from stub to real logic, keep the same response shapes.