from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any

app = FastAPI(title="RocketGPT Core API", version="1.0.0")

# allow your UI origins (add both prod URLs + localhost for dev)
ALLOWED_ORIGINS = [
    "https://rocketgpt-git-main-nirav-shahs-projects-9c841707.vercel.app",
    "https://rocketgpt-ui.onrender.com",  # if you deploy UI on Render too
    "http://localhost:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=False,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)

# --- Health & root ---
@app.get("/")
def root():
    return {"ok": True, "service": "rocketgpt-core-api", "docs": "/docs"}

@app.get("/health")
def health():
    return {"status": "healthy"}

# --- Schema models (same as before) ---
class Attachment(BaseModel):
    type: str
    name: Optional[str] = None
    url: Optional[str] = None

class Message(BaseModel):
    role: str
    content: str
    attachments: Optional[List[Attachment]] = None

class Step(BaseModel):
    id: str
    title: str
    detail: Optional[str] = None
    status: str = Field(default="pending")

class Estimates(BaseModel):
    costINR: float = 0
    minutes: int = 5
    steps: int = 3
    confidence: float = 0.8
    assumptions: Optional[List[str]] = None

class Decision(BaseModel):
    summary: str
    toolId: Optional[str] = None
    estimates: Estimates

class Recommendation(BaseModel):
    toolId: str
    title: str
    why: str
    avoidWhen: Optional[str] = None
    estimates: Estimates
    actions: Optional[List[Dict[str, Any]]] = None
    badges: Optional[Dict[str, Any]] = None

class PlanRequest(BaseModel):
    goal: str
    context: Optional[Dict[str, Any]] = None
    history: Optional[List[Message]] = None

class PlanResponse(BaseModel):
    plan: List[Step]
    decision: Decision

class RecommendRequest(BaseModel):
    goal: str
    plan: Optional[List[Step]] = None
    preferences: Optional[Dict[str, Any]] = None

class RecommendResponse(BaseModel):
    decision: Decision
    recommendations: List[Recommendation]

class EstimatePath(BaseModel):
    toolId: str
    template: Optional[str] = None
    steps: Optional[List[Step]] = None
    inputs: Optional[Dict[str, Any]] = None

class EstimateRequest(BaseModel):
    path: EstimatePath

class EstimateResponse(BaseModel):
    estimates: Estimates
    breakdown: Optional[List[Dict[str, Any]]] = None

@app.post("/plan", response_model=PlanResponse)
def plan(req: PlanRequest):
    plan = [
        Step(id="step1", title="Pick a template", detail="Use Canva free A4 brochure"),
        Step(id="step2", title="Replace content", detail="Logo, tagline, bullets, CTA"),
        Step(id="step3", title="Export PDF", detail="A4, high quality")
    ]
    decision = Decision(
        summary="Proceed with Canva Free; export A4 PDF.",
        toolId="canva",
        estimates=Estimates(costINR=0, minutes=10, steps=3, confidence=0.82, assumptions=["assets ready"])
    )
    return PlanResponse(plan=plan, decision=decision)

@app.post("/recommend", response_model=RecommendResponse)
def recommend(req: RecommendRequest):
    recs = [
        Recommendation(
            toolId="canva",
            title="Use Canva (free)",
            why="Fastest path with templates",
            avoidWhen="Complex vector work",
            estimates=Estimates(costINR=0, minutes=10, steps=3, confidence=0.82),
            badges={"reliability":0.95,"pricing":"freemium"}
        ),
        Recommendation(
            toolId="google_docs",
            title="Google Docs (free)",
            why="If you need text-first flow",
            avoidWhen="Heavy layout needs",
            estimates=Estimates(costINR=0, minutes=8, steps=3, confidence=0.75),
            badges={"reliability":0.98,"pricing":"free"}
        )
    ]
    decision = recs[0]
    return RecommendResponse(
        decision=Decision(summary=f"Go with {decision.title}.", toolId=decision.toolId, estimates=decision.estimates),
        recommendations=recs
    )

@app.post("/estimate", response_model=EstimateResponse)
def estimate(req: EstimateRequest):
    minutes = 8 if req.path.template else 12
    steps = len(req.path.steps) if req.path.steps else 3
    est = Estimates(costINR=0.0, minutes=minutes, steps=steps, confidence=0.78)
    breakdown = [{"stepId": f"step{i+1}", "minutes": max(2, minutes//steps), "costINR": 0.0} for i in range(steps)]
    return EstimateResponse(estimates=est, breakdown=breakdown)
