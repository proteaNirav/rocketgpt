# rocketgpt_v3_full/api/python/main.py
from __future__ import annotations

from fastapi import FastAPI, HTTPException, Body, Query
from fastapi.responses import PlainTextResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware

from pydantic import BaseModel, Field
from typing import List, Dict, Any
import os, time, json
import httpx

# -----------------------------------------------------------------------------
# App & static
# -----------------------------------------------------------------------------
app = FastAPI(title="RocketGPT Orchestration API", version="3.0")

# Serve static landing at /web (keep root free for JSON hello)
app.mount("/web", StaticFiles(directory="web", html=True), name="static")

# Friendly root
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
            "tool_finder": "/find-tools?q=agent&category=ai_agents_orchestrators",
            "static_landing": "/web"
        }
    }

# -----------------------------------------------------------------------------
# CORS & basic rate limiting
# -----------------------------------------------------------------------------
ALLOWED_ORIGINS = [
    o.strip() for o in os.environ.get("RGPT_CORS_ORIGINS", "").split(",") if o.strip()
] or ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

RATE_BUCKET: Dict[str, Any] = {}
MAX_REQ_PER_MIN = int(os.environ.get("RGPT_RATE_PER_MIN", "180"))

@app.middleware("http")
async def rate_limit(request, call_next):
    ip = request.client.host if request.client else "unknown"
    now = int(time.time())
    count, reset = RATE_BUCKET.get(ip, (0, now + 60))
    if now > reset:
        count, reset = 0, now + 60
    if count >= MAX_REQ_PER_MIN:
        return PlainTextResponse("Too Many Requests", status_code=429)
    RATE_BUCKET[ip] = (count + 1, reset)
    return await call_next(request)

# -----------------------------------------------------------------------------
# Metrics & health
# -----------------------------------------------------------------------------
REQUESTS_TOTAL = 0
ORCH_TOTAL = 0

@app.middleware("http")
async def req_counter(request, call_next):
    global REQUESTS_TOTAL
    REQUESTS_TOTAL += 1
    return await call_next(request)

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

# -----------------------------------------------------------------------------
# Configuration paths
# -----------------------------------------------------------------------------
TOOLBASE_PATH = os.environ.get("RGPT_TOOLBASE", "tools/ToolBase.json")
SYSTEM_PROMPT_PATH = os.environ.get(
    "RGPT_SYSTEM_PROMPT",
    "core/config/rocketgpt_system_prompt.prod.md"
)

# -----------------------------------------------------------------------------
# Helpers: load config, scoring
# -----------------------------------------------------------------------------
def load_toolbase() -> Dict[str, Any]:
    with open(TOOLBASE_PATH, "r", encoding="utf-8") as f:
        return json.load(f)

@app.get("/system-prompt")
def system_prompt():
    with open(SYSTEM_PROMPT_PATH, "r", encoding="utf-8") as f:
        return {"path": SYSTEM_PROMPT_PATH, "content": f.read()}

def score_tool(tool: Dict[str, Any], kws: List[str], prefs: List[str]) -> float:
    strengths = [s.lower() for s in (tool.get("strengths") or []) + (tool.get("best_for") or [])]
    hits = sum(1 for k in kws if k.lower() in strengths)
    relevance = min(1.0, hits / max(1, len(kws)))

    accessibility = 1.0 if (tool.get("pricing") in ("Free", "Freemium/Paid", "Free/Paid")) else 0.6
    ms = max(400, min(4000, int(tool.get("latency_ms_est", 1500))))
    latency = 1.0 - (ms - 400) / 3600.0

    cost_map = {"Free": 1.0, "Free/Paid": 0.8, "Freemium/Paid": 0.7, "Paid": 0.5}
    cost = cost_map.get(tool.get("pricing"), 0.6)

    familiarity = 1.0 if tool.get("name") in (prefs or []) else 0.6

    w = {"relevance": 0.45, "accessibility": 0.15, "latency": 0.15, "cost": 0.15, "familiarity": 0.10}
    return sum([
        w["relevance"] * relevance,
        w["accessibility"] * accessibility,
        w["latency"] * latency,
        w["cost"] * cost,
        w["familiarity"] * familiarity,
    ])

# -----------------------------------------------------------------------------
# Planner / Orchestrator
# -----------------------------------------------------------------------------
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
    ranked = sorted(tb, key=lambda t: score_tool(t, kws, req.org_prefs), reverse=True)[:3]

    tools_out = [{
        "name": t.get("name"),
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

# -----------------------------------------------------------------------------
# Tool Finder (fuzzy + facets + synonyms)
# -----------------------------------------------------------------------------
DOMAIN_SYNONYMS = {
    "architecture": "real estate",
    "architect": "real estate",
    "cad": "real estate",
    "construction": "real estate",
    "design": "creative",
    "dev": "developer",
    "engineering": "developer",
}

def _canon(s: str) -> str:
    return (s or "").strip().lower()

@app.get("/find-tools")
def find_tools(
    q: str = Query("", alias="q"),
    domain: str = Query("", alias="domain"),
    category: str = Query("", alias="category"),
    pricing: str = Query("", alias="pricing"),
    limit: int = Query(20, ge=1, le=100)
):
    tb = load_toolbase()["tools"]
    q_  = _canon(q)
    dom = _canon(domain)
    cat = _canon(category)
    pri = _canon(pricing)

    if dom in DOMAIN_SYNONYMS:
        dom = DOMAIN_SYNONYMS[dom]

    results: List[Dict[str, Any]] = []
    for t in tb:
        blob = json.dumps(t, ensure_ascii=False).lower()
        if q_  and q_  not in blob:                       continue
        if dom and dom not in _canon(t.get("domain")):    continue
        if cat and cat not in _canon(t.get("category")):  continue
        if pri and pri not in _canon(t.get("pricing")):   continue
        results.append(t)

    # Light re-rank: strength hits first, then lower latency
    def rank_key(t: Dict[str, Any]):
        S = "|".join((t.get("strengths") or []) + (t.get("best_for") or [])).lower()
        s_hit = 1 if (q_ and (q_ in S)) else 0
        lat   = int(t.get("latency_ms_est", 1500))
        return (-s_hit, lat)

    results.sort(key=rank_key)
    return {"count": len(results), "items": results[:limit]}

# -----------------------------------------------------------------------------
# Unbiased model router (Groq/OpenAI/Google/Anthropic)
# -----------------------------------------------------------------------------
ENABLE_AUTOPILOT = os.environ.get("RGPT_ENABLE_AUTOPILOT", "false").lower() == "true"

PROVIDERS: Dict[str, Dict[str, Any]] = {
    "groq": {
        "enabled": os.environ.get("RGPT_ENABLE_GROQ", "false").lower() == "true" and bool(os.environ.get("GROQ_API_KEY")),
        "key": os.environ.get("GROQ_API_KEY"),
        "models": {
            "speed":    "llama-3.1-8b-instant",
            "balanced": "llama-3.1-8b-instant",
            "quality":  "llama-3.3-70b-versatile",
        },
        "latency_ms": {"speed": 450, "balanced": 600, "quality": 1100},
        "cost": "free",
    },
    "openai": {
        "enabled": os.environ.get("RGPT_ENABLE_OPENAI", "false").lower() == "true" and bool(os.environ.get("OPENAI_API_KEY")),
        "key": os.environ.get("OPENAI_API_KEY"),
        "models": {
            "speed":    "gpt-4o-mini",
            "balanced": "gpt-4o-mini",
            "quality":  "gpt-4o",
        },
        "latency_ms": {"speed": 700, "balanced": 800, "quality": 1200},
        "cost": "paid",
    },
    "google": {
        "enabled": os.environ.get("RGPT_ENABLE_GOOGLE", "false").lower() == "true" and bool(os.environ.get("GOOGLE_API_KEY")),
        "key": os.environ.get("GOOGLE_API_KEY"),
        "models": {
            "speed":    "gemini-1.5-flash",
            "balanced": "gemini-1.5-flash",
            "quality":  "gemini-1.5-pro",
        },
        "latency_ms": {"speed": 650, "balanced": 750, "quality": 1200},
        "cost": "paid",
    },
    "anthropic": {
        "enabled": os.environ.get("RGPT_ENABLE_ANTHROPIC", "false").lower() == "true" and bool(os.environ.get("ANTHROPIC_API_KEY")),
        "key": os.environ.get("ANTHROPIC_API_KEY"),
        "models": {
            "speed":    "claude-3-haiku-20240307",
            "balanced": "claude-3-5-sonnet-20240620",
            "quality":  "claude-3-5-sonnet-20240620",
        },
        "latency_ms": {"speed": 700, "balanced": 900, "quality": 1200},
        "cost": "paid",
    },
}

# Budget guard: free | low | any
ALLOWED_COST = os.environ.get("RGPT_ALLOWED_COST", "any").lower()

def decide_quality(mode: str, persona: str) -> str:
    if mode == "/fast": return "speed"
    if mode == "/deep" and persona in ("professional", "expert"): return "quality"
    return "balanced"

def choose_provider(quality: str) -> tuple[str, str, int]:
    def allowed(p: Dict[str, Any]) -> bool:
        if ALLOWED_COST == "free": return p["cost"] == "free"
        if ALLOWED_COST == "low":  return p["cost"] in ("free", "freemium", "free/paid", "freemium/paid")
        return True

    candidates: List[tuple[str, str, int]] = []
    for name, p in PROVIDERS.items():
        if not p["enabled"]: continue
        if not allowed(p):   continue
        model = p["models"].get(quality)
        if not model:        continue
        candidates.append((name, model, int(p["latency_ms"][quality])))

    if not candidates:
        raise HTTPException(503, "No text-generation providers enabled or allowed by policy")

    candidates.sort(key=lambda x: (x[2], x[0]))  # pick lowest expected latency
    return candidates[0]

GEN_TIMEOUT = float(os.environ.get("RGPT_GEN_TIMEOUT_S", "20"))
GEN_MAXTOK  = int(os.environ.get("RGPT_GEN_MAX_TOKENS", "700"))

async def call_groq(model: str, prompt: str) -> str:
    key = PROVIDERS["groq"]["key"]
    async with httpx.AsyncClient(timeout=GEN_TIMEOUT) as cx:
        r = await cx.post(
            "https://api.groq.com/openai/v1/chat/completions",
            headers={"Authorization": f"Bearer {key}", "Content-Type": "application/json"},
            json={"model": model, "messages":[{"role":"user","content":prompt}],
                  "max_completion_tokens": GEN_MAXTOK, "temperature": 0.4}
        )
    if r.status_code >= 400: raise HTTPException(502, f"Groq upstream {r.status_code}: {r.text[:180]}")
    d = r.json()
    return d["choices"][0]["message"]["content"]

async def call_openai(model: str, prompt: str) -> str:
    key = PROVIDERS["openai"]["key"]
    async with httpx.AsyncClient(timeout=GEN_TIMEOUT) as cx:
        r = await cx.post(
            "https://api.openai.com/v1/chat/completions",
            headers={"Authorization": f"Bearer {key}", "Content-Type": "application/json"},
            json={"model": model, "messages":[{"role":"user","content":prompt}],
                  "max_tokens": GEN_MAXTOK, "temperature": 0.4}
        )
    if r.status_code >= 400: raise HTTPException(502, f"OpenAI upstream {r.status_code}: {r.text[:180]}")
    d = r.json()
    return d["choices"][0]["message"]["content"]

async def call_google(model: str, prompt: str) -> str:
    key = PROVIDERS["google"]["key"]
    async with httpx.AsyncClient(timeout=GEN_TIMEOUT) as cx:
        r = await cx.post(
            f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={key}",
            headers={"Content-Type": "application/json"},
            json={"contents":[{"parts":[{"text": prompt}]}],
                  "generationConfig":{"temperature":0.4, "maxOutputTokens": GEN_MAXTOK}}
        )
    if r.status_code >= 400: raise HTTPException(502, f"Google upstream {r.status_code}: {r.text[:180]}")
    d = r.json()
    return d["candidates"][0]["content"]["parts"][0]["text"]

async def call_anthropic(model: str, prompt: str) -> str:
    key = PROVIDERS["anthropic"]["key"]
    async with httpx.AsyncClient(timeout=GEN_TIMEOUT) as cx:
        r = await cx.post(
            "https://api.anthropic.com/v1/messages",
            headers={"x-api-key": key, "content-type":"application/json", "anthropic-version":"2023-06-01"},
            json={"model": model, "max_tokens": GEN_MAXTOK, "temperature":0.4,
                  "messages":[{"role":"user","content": prompt}]}
        )
    if r.status_code >= 400: raise HTTPException(502, f"Anthropic upstream {r.status_code}: {r.text[:180]}")
    d = r.json()
    return "".join([blk.get("text","") for blk in d.get("content", []) if isinstance(blk, dict)])

async def route_and_generate(prompt: str, quality: str) -> Dict[str, Any]:
    provider, model, _ = choose_provider(quality)
    if provider == "groq":        out = await call_groq(model, prompt)
    elif provider == "openai":    out = await call_openai(model, prompt)
    elif provider == "google":    out = await call_google(model, prompt)
    elif provider == "anthropic": out = await call_anthropic(model, prompt)
    else:
        raise HTTPException(500, "No provider matched")
    return {"provider": provider, "model": model, "output": out}

def postprocess(mode: str, text: str) -> str:
    if mode in ("/fast", "/organize"):
        lines = [l.strip() for l in text.split("\n") if l.strip()]
        bullets = [f"- {l}" for l in lines][:12]
        return "\n".join(bullets)
    return text

# -----------------------------------------------------------------------------
# Text generation endpoints
# -----------------------------------------------------------------------------
class GenerateRequest(BaseModel):
    prompt: str
    mode: str = "/fast"
    persona: str = "professional"

@app.post("/generate")
async def generate(req: GenerateRequest = Body(...)):
    if not ENABLE_AUTOPILOT:
        return {"error": "autopilot disabled"}
    quality = decide_quality(req.mode, req.persona)
    res = await route_and_generate(req.prompt, quality)
    res["quality"] = quality
    res["output"]  = postprocess(req.mode, res["output"])
    return res

class PlanAndGenerateRequest(BaseModel):
    task: str
    persona: str = "professional"
    mode: str = "/fast"
    org_prefs: List[str] = []

@app.post("/plan-and-generate")
async def plan_and_generate(req: PlanAndGenerateRequest = Body(...)):
    if not ENABLE_AUTOPILOT:
        return {"error": "autopilot disabled"}

    plan = orchestrate(OrchestrateRequest(
        task=req.task, persona=req.persona, mode=req.mode, org_prefs=req.org_prefs
    ))

    quality = decide_quality(req.mode, req.persona)
    prompt = (
        "You are RocketGPT, an expert orchestrator leading a 100-person AI team.\n"
        f"Task: {req.task}\nMode: {req.mode} | Persona: {req.persona}\n"
        f"Selected tools: {[t['name'] for t in plan.tools]}\n"
        "Workflow:\n- " + "\n- ".join(plan.workflow) + "\n"
        "Deliver a concise, high-quality answer that follows the workflow and notes tools used."
    )

    res = await route_and_generate(prompt, quality)
    return {
        "plan": plan,
        "provider": res["provider"],
        "model": res["model"],
        "quality": quality,
        "output": postprocess(req.mode, res["output"])
    }
