from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any

# ---- App + CORS -------------------------------------------------------------

app = FastAPI(title="RocketGPT Core API", version="1.0.0")

ALLOWED_ORIGINS = [
    "https://rocketgpt-git-main-nirav-shahs-projects-9c841707.vercel.app",
    "https://rocketgpt-ui.onrender.com",
    "http://localhost:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=False,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)

# ---- Health -----------------------------------------------------------------

@app.get("/")
def root():
    return {"ok": True, "service": "rocketgpt-core-api", "docs": "/docs"}

@app.get("/health")
def health():
    return {"status": "healthy"}

# ---- Schemas ----------------------------------------------------------------

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

# ---- Endpoints --------------------------------------------------------------

@app.post("/plan", response_model=PlanResponse)
def plan(req: PlanRequest):
    g = (req.goal or "").lower().strip()

    # 1) Brochure / Print design
    if any(k in g for k in ["brochure", "flyer", "poster", "pamphlet"]):
        plan_steps = [
            Step(id="step1", title="Pick a brochure template", detail="Use Canva (A4)"),
            Step(id="step2", title="Replace content", detail="Logo, tagline, bullets, CTA"),
            Step(id="step3", title="Export PDF", detail="A4, high quality"),
        ]
        decision = Decision(
            summary="Use Canva Free for a quick brochure.",
            toolId="canva",
            estimates=Estimates(costINR=0, minutes=10, steps=3, confidence=0.82),
        )

    # 2) Presentation / Slides
    elif any(k in g for k in ["presentation", "deck", "slides", "pitch deck"]):
        plan_steps = [
            Step(id="step1", title="Choose a slides template", detail="Google Slides or Canva"),
            Step(id="step2", title="Outline 5–7 slides", detail="Title, Problem, Solution, CTA"),
            Step(id="step3", title="Polish visuals", detail="Icons, brand colors"),
        ]
        decision = Decision(
            summary="Start in Google Slides for collaboration.",
            toolId="google_docs",
            estimates=Estimates(costINR=0, minutes=12, steps=3, confidence=0.80),
        )

    # 3) Wiki / Documentation
    elif any(k in g for k in ["wiki", "documentation", "knowledge base", "gitbook", "confluence", "docs site"]):
        plan_steps = [
            Step(id="step1", title="Pick a wiki tool", detail="Notion, GitBook, GitHub Wiki, or Confluence"),
            Step(id="step2", title="Create structure", detail="Home page + sections (About, Setup, FAQ)"),
            Step(id="step3", title="Draft & publish", detail="Add content, share link/permissions"),
        ]
        decision = Decision(
            summary="Use Notion or GitBook for a quick, shareable wiki.",
            toolId="notion",
            estimates=Estimates(costINR=0, minutes=8, steps=3, confidence=0.85),
        )

    # Default generic plan
    else:
        plan_steps = [
            Step(id="step1", title="Clarify outcome", detail="Define deliverable + success metric"),
            Step(id="step2", title="Pick the best free tool", detail="Based on speed/cost"),
            Step(id="step3", title="Execute and export", detail="Deliver in preferred format"),
        ]
        decision = Decision(
            summary="Pick a free tool and execute quickly.",
            toolId=None,
            estimates=Estimates(costINR=0, minutes=8, steps=3, confidence=0.70),
        )

    return PlanResponse(plan=plan_steps, decision=decision)


@app.post("/recommend", response_model=RecommendResponse)
def recommend(req: RecommendRequest):
    g = (req.goal or "").lower().strip()

    # 1) Brochure / Print design
    if any(k in g for k in ["brochure", "flyer", "poster", "pamphlet"]):
        recs = [
            Recommendation(
                toolId="canva",
                title="Use Canva (free)",
                why="Fast templates for print",
                estimates=Estimates(costINR=0, minutes=10, steps=3),
                badges={"pricing": "freemium", "reliability": 0.95},
            ),
            Recommendation(
                toolId="gimp",
                title="GIMP (free, offline)",
                why="If you need local edits",
                estimates=Estimates(costINR=0, minutes=15, steps=4),
                badges={"pricing": "free", "reliability": 0.85},
            ),
        ]

    # 2) Presentation / Slides
    elif any(k in g for k in ["presentation", "deck", "slides", "pitch deck"]):
        recs = [
            Recommendation(
                toolId="google_docs",
                title="Google Slides (free)",
                why="Best for collaboration",
                estimates=Estimates(costINR=0, minutes=12, steps=3),
                badges={"pricing": "free", "reliability": 0.98},
            ),
            Recommendation(
                toolId="canva",
                title="Canva (slides)",
                why="Beautiful slide templates",
                estimates=Estimates(costINR=0, minutes=10, steps=3),
                badges={"pricing": "freemium", "reliability": 0.95},
            ),
        ]

    # 3) Wiki / Documentation
    elif any(k in g for k in ["wiki", "documentation", "knowledge base", "gitbook", "confluence", "docs site"]):
        recs = [
            Recommendation(
                toolId="notion",
                title="Notion (free)",
                why="Fast, flexible wiki with easy sharing",
                estimates=Estimates(costINR=0, minutes=8, steps=3),
                badges={"pricing": "freemium", "reliability": 0.95},
            ),
            Recommendation(
                toolId="gitbook",
                title="GitBook (free tier)",
                why="Great docs UX + public link",
                estimates=Estimates(costINR=0, minutes=10, steps=3),
                badges={"pricing": "freemium", "reliability": 0.90},
            ),
            Recommendation(
                toolId="github_wiki",
                title="GitHub Wiki (free)",
                why="Ideal if your code is already on GitHub",
                estimates=Estimates(costINR=0, minutes=10, steps=3),
                badges={"pricing": "free", "reliability": 0.90},
            ),
        ]

    # Default generic suggestions
    else:
        recs = [
            Recommendation(
                toolId="notion",
                title="Notion",
                why="Flexible workspace",
                estimates=Estimates(costINR=0, minutes=8, steps=3),
                badges={"pricing": "freemium", "reliability": 0.90},
            )
        ]

    decision = recs[0]
    return RecommendResponse(
        decision=Decision(
            summary=f"Go with {decision.title}.",
            toolId=decision.toolId,
            estimates=decision.estimates,
        ),
        recommendations=recs,
    )


@app.post("/estimate", response_model=EstimateResponse)
def estimate(req: EstimateRequest):
    minutes = 8 if req.path.template else 12
    steps = len(req.path.steps) if req.path.steps else 3
    est = Estimates(costINR=0.0, minutes=minutes, steps=steps, confidence=0.78)
    breakdown = [
        {"stepId": f"step{i+1}", "minutes": max(2, minutes // steps), "costINR": 0.0}
        for i in range(steps)
    ]
    return EstimateResponse(estimates=est, breakdown=breakdown)
