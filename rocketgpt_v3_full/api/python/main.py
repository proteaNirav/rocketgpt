# rocketgpt_v3_full/api/python/main.py

from fastapi import FastAPI, HTTPException
from fastapi.responses import PlainTextResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import List, Dict, Any
import os, time, json, httpx

app = FastAPI(title="RocketGPT Orchestration API", version="3.0")

# Serve the simple landing at /web (NOT at "/")
app.mount("/web", StaticFiles(directory="web", html=True), name="static")

# ---- Friendly root ----
@app.get("/", response_class=JSONResponse)
def root():
    return {
        "service": "RocketGPT Orchestration API",
        "status": "ready",
        "version": "3.0",
        "docs": {
            "health": "/health",
            "metrics": "/metrics",
            "system_prompt": "/system-prompt",
            "plan": "/orchestrate",
            "generate": "/generate",
            "plan_and_generate": "/plan-and-generate",
            "static_landing": "/web"
        }
    }


# ---- CORS ----
ALLOWED_ORIGINS = [o.strip() for o in os.environ.get("RGPT_CORS_ORIGINS","").split(",") if o.strip()] or ["*"]
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---- Simple rate limit (per-IP, per-minute) ----
RATE_BUCKET: Dict[str, Any] = {}
MAX_REQ_PER_MIN = int(os.environ.get("RGPT_RATE_PER_MIN", "120"))

@app.middleware("http")
async def rate_limit(request, call_next):
    ip = request.client.host
    now = int(time.time())
    count, reset = RATE_BUCKET.get(ip, (0, now + 60))
    if now > reset:
        count, reset = 0, now + 60
    if count >= MAX_REQ_PER_MIN:
        return PlainTextResponse("Too Many Requests", status_code=429)
    RATE_BUCKET[ip] = (count + 1, reset)
    return await call_next(request)

# ---- Metrics counters ----
REQUESTS_TOTAL = 0
ORCH_TOTAL = 0

TOOLBASE_PATH = os.environ.get("RGPT_TOOLBASE", "tools/ToolBase.json")
SYSTEM_PROMPT_PATH = os.environ.get("RGPT_SYSTEM_PROMPT", "core/config/rocketgpt_system_prompt.prod.md")

@app.middleware("http")
async def counter(request, call_next):
    global REQUESTS_TOTAL
    REQUESTS_TOTAL += 1
    return await call_next(request)

# ---- Health / Metrics ----
@app.get("/health")
def health_check():
    return {"status": "ok", "version": "3.0"}

@app.get("/metrics", response_class=PlainTextResponse)
def metrics():
    return "\n".join([
        "# HELP rocketgpt_requests_total Total HTTP requests",
        "# TYPE rocketgpt_requests_total counter",
        f"rocketgpt_requests_total {REQUESTS_TOTAL}",
        "# HELP rocketgpt_orchestrate_total Total orchestrate calls",
        "# TYPE rocketgpt_orchestrate_total counter",
        f"rocketgpt_orchestrate_total {ORCH_TOTAL}",
    ])

# ---- Config / Toolbase helpers ----
@app.get("/system-prompt")
def system_prompt():
    with open(SYSTEM_PROMPT_PATH, "r", encoding="utf-8") as f:
        return {"path": SYSTEM_PROMPT_PATH, "content": f.read()}

def load_toolbase():
    with open(TOOLBASE_PATH, "r", encoding="utf-8") as f:
        return json.load(f)

def score(tool, kws, prefs):
    strengths = [s.lower() for s in tool.get("strengths", []) + tool.get("best_for", [])]
    hits = sum(1 for k in kws if k.lower() in strengths)
    relevance = min(1.0, hits / max(1, len(kws)))
    accessibility = 1.0 if tool.get("pricing") in ("Free", "Freemium/Paid", "Free/Paid") else 0.6
    ms = max(400, min(4000, int(tool.get("latency_ms_est", 1500))))
    latency = 1.0 - (ms - 400) / 3600.0
    cost_map = {"Free": 1.0, "Free/Paid": 0.8, "Freemium/Paid": 0.7, "Paid": 0.5}
    cost = cost_map.get(tool.get("pricing"), 0.6)
    familiarity = 1.0 if tool.get("name") in prefs else 0.6
    w = {"relevance": 0.45, "accessibility": 0.15, "latency": 0.15, "cost": 0.15, "familiarity": 0.10}
    return sum([
        w["relevance"] * relevance,
        w["accessibility"] * accessibility,
        w["latency"] * latency,
        w["cost"] * cost,
        w["familiarity"] * familiarity,
    ])

# ---- Planner ----
class OrchestrateRequest(BaseModel):
    task: str
    persona: str = Field("professional")
    mode: str = Field("/fast")
    org_prefs: List[str] = Field(default_factory=lambda: ["ChatGPT", "Claude"])

class OrchestrateResponse(BaseModel):
    understood: str
    tools: List[Dict[str, Any]]
    workflow: List[str]
    summary: str

@app.post("/orchestrate", response_model=OrchestrateResponse)
def orchestrate(req: OrchestrateRequest):
    global ORCH_TOTAL
    ORCH_TOTAL += 1
    tb = load_toolbase()["tools"]
    kws = [req.mode] + [w.strip(",.") for w in req.task.lower().split() if len(w) > 3]
    ranked = sorted(tb, key=lambda t: score(t, kws, req.org_prefs), reverse=True)[:3]
    tools_out = [{
        "name": t["name"],
        "purpose": t.get("role"),
        "pricing": t.get("pricing"),
        "access_url": t.get("access_url"),
        "workflow_role": "primary" if i == 0 else "supporting",
        "latency_ms_est": t.get("latency_ms_est"),
    } for i, t in enumerate(ranked)]
    workflow = (
        [
            f"Step 1 — Use {tools_out[0]['name']} as primary for '{req.task}' ({req.mode}).",
            f"Step 2 — Validate with {tools_out[1]['name']}.",
            f"Step 3 — Summarize via {tools_out[2]['name']}."
        ] if len(tools_out) == 3 else
        ["Review ToolBase.json; not enough tools found."]
    )
    understood = f"Persona={req.persona}; Mode={req.mode}; Goal='{req.task}'"
    summary = f"Summary: Route user goal to top tools → {[t['name'] for t in tools_out]}"
    return OrchestrateResponse(
        understood=understood,
        tools=tools_out,
        workflow=workflow,
        summary=summary
    )

# ---- AutoPilot (Groq) ----
ENABLE_AUTOPILOT = os.environ.get("RGPT_ENABLE_AUTOPILOT", "false").lower() == "true"
ENABLE_GROQ = os.environ.get("RGPT_ENABLE_GROQ", "false").lower() == "true"
GROQ_KEY = os.environ.get("GROQ_API_KEY")
GEN_TIMEOUT = float(os.environ.get("RGPT_GEN_TIMEOUT_S", "20"))
GEN_MAXTOK = int(os.environ.get("RGPT_GEN_MAX_TOKENS", "700"))

class GenerateRequest(BaseModel):
    prompt: str
    mode: str = "/fast"
    persona: str = "professional"

class PlanAndGenerateRequest(BaseModel):
    task: str
    persona: str = "professional"
    mode: str = "/fast"
    org_prefs: List[str] = []

def decide_quality(mode, persona):
    if mode == "/fast":
        return "speed"
    if mode == "/deep" and persona in ("professional", "expert"):
        return "quality"
    return "balanced"

def postprocess(mode, text):
    if mode in ("/fast", "/organize"):
        lines = [l.strip() for l in text.split("\n") if l.strip()]
        bullets = [f"- {l}" for l in lines][:12]
        return "\n".join(bullets)
    return text

async def groq_generate(prompt: str, model: str):
    if not (ENABLE_GROQ and GROQ_KEY):
        raise HTTPException(500, "Groq not enabled or key missing")

    payload = {
        "model": model,
        "messages": [{"role": "user", "content": prompt}],
        "max_completion_tokens": GEN_MAXTOK,  # Groq prefers this field
        "temperature": 0.4,
        "stream": False
    }

    async with httpx.AsyncClient(timeout=GEN_TIMEOUT) as cx:
        r = await cx.post(
            "https://api.groq.com/openai/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {GROQ_KEY}",
                "Content-Type": "application/json"
            },
            json=payload
        )

    if r.status_code >= 400:
        # Pass through trimmed upstream error
        raise HTTPException(502, f"Groq upstream error {r.status_code}: {r.text[:180]}")

    data = r.json()
    return {
        "provider": "groq",
        "model": data.get("model", model),
        "output": data["choices"][0]["message"]["content"]
    }

from fastapi import Body

@app.post("/generate")
async def generate(req: GenerateRequest = Body(...)):
    if not ENABLE_AUTOPILOT:
        return {"error": "autopilot disabled"}
    quality = decide_quality(req.mode, req.persona)
    # Use current Groq model IDs
    model = "llama-3.1-8b-instant" if quality in ("speed", "balanced") else "llama-3.3-70b-versatile"
    res = await groq_generate(req.prompt, model=model)
    res["quality"] = quality
    res["output"] = postprocess(req.mode, res["output"])
    return res

@app.post("/plan-and-generate")
async def plan_and_generate(req: PlanAndGenerateRequest = Body(...)):
    if not ENABLE_AUTOPILOT:
        return {"error": "autopilot disabled"}
    plan = orchestrate(OrchestrateRequest(
        task=req.task, persona=req.persona, mode=req.mode, org_prefs=req.org_prefs
    ))
    quality = decide_quality(req.mode, req.persona)
    model = "llama-3.1-8b-instant" if quality in ("speed", "balanced") else "llama-3.3-70b-versatile"
    prompt = (
        "You are RocketGPT, an expert orchestrator leading a 100-person AI team.\n"
        f"Task: {req.task}\nMode: {req.mode} | Persona: {req.persona}\n"
        f"Selected tools: {[t['name'] for t in plan.tools]}\n"
        "Workflow:\n- " + "\n- ".join(plan.workflow) + "\n"
        "Deliver a concise, high-quality answer that follows the workflow and notes tools used."
    )
    res = await groq_generate(prompt, model=model)
    return {
        "plan": plan,
        "provider": res["provider"],
        "model": res["model"],
        "quality": quality,
        "output": postprocess(req.mode, res["output"])
    }
