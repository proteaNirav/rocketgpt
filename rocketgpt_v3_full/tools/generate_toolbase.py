#!/usr/bin/env python3
"""
RocketGPT ToolBase builder
- Normalizes multiple inputs (inline, CSV, JSON) into tools/ToolBase.json
- Supports AI + traditional software (CAD, PDF, IDEs, PM, CRM, etc.)
- Unbiased metadata (no provider preference)
"""
import csv, json, os, re, time, glob
from pathlib import Path
from typing import Dict, Any, List

ROOT = Path(__file__).resolve().parents[1]  # project root
OUT_PATH = ROOT / "tools" / "ToolBase.json"
SRC_DIR  = ROOT / "tools" / "sources"
SCHEMA_PATH = ROOT / "tools" / "ToolBase_Schema.json"

NOW = time.strftime("%Y-%m-%d")

# ---------- heuristics ----------
DOMAIN_MAP = {
    "Development": ["code", "ide", "debug", "git", "devops", "ci", "security"],
    "Creative": ["image", "video", "audio", "design", "illustration", "render"],
    "Architecture": ["cad", "bim", "dwg", "revit", "civil", "mechanical", "cam", "gis"],
    "Office": ["pdf", "office", "docs", "mail", "calendar", "notes"],
    "Data": ["db", "etl", "bi", "viz", "analytics", "search", "vector-db"],
    "Marketing": ["ads", "seo", "email", "social", "cms"],
    "Ops": ["automation", "workflow", "scheduling", "rpa", "integration"],
    "Enterprise": ["crm", "erp", "project-management", "legal", "finance"],
    "Communication": ["chat", "video-call", "collaboration", "messaging"],
    "Utilities": ["ocr", "pdf-reader", "e-sign", "zip", "backup", "monitoring"]
}

DEFAULTS = {
    "pricing": "Freemium/Paid",
    "latency_ms_est": 1200,
    "integration_type": "saas",
    "reliability_score": 0.85,
    "popularity_score": 0.6,
}

def guess_domain_category(name:str, role:str, category:str, tags:List[str])->(str,str):
    txt = " ".join([name or "", role or "", category or "", " ".join(tags or [])]).lower()
    for dom, keys in DOMAIN_MAP.items():
        if any(k in txt for k in keys):
            # guess a category token from keys
            for k in keys:
                if k in txt:
                    return dom, k
            return dom, "general"
    return "Utilities", "general"

def norm_tool(t:Dict[str,Any])->Dict[str,Any]:
    t = {k:v for k,v in t.items() if v is not None}
    t.setdefault("vendor", "Unknown")
    t.setdefault("role", "general")
    t.setdefault("category", "general")
    t.setdefault("domain", None)
    t.setdefault("sub_category", None)
    t.setdefault("strengths", [])
    t.setdefault("best_for", [])
    t.setdefault("pricing", DEFAULTS["pricing"])
    t.setdefault("latency_ms_est", DEFAULTS["latency_ms_est"])
    t.setdefault("integration_type", DEFAULTS["integration_type"])
    t.setdefault("tags", [])
    t.setdefault("reliability_score", DEFAULTS["reliability_score"])
    t.setdefault("popularity_score", DEFAULTS["popularity_score"])
    if not t.get("domain"):
        dom, cat_guess = guess_domain_category(t.get("name",""), t.get("role",""), t.get("category",""), t.get("tags",[]))
        t["domain"] = dom
        if t.get("category") == "general":
            t["category"] = cat_guess
    return t

def dedupe(tools:List[Dict[str,Any]])->List[Dict[str,Any]]:
    seen = {}
    out = []
    for t in tools:
        key = re.sub(r"\W+","", (t.get("name","")+t.get("vendor","")).lower())
        if key in seen:
            # merge light
            old = seen[key]
            old["strengths"] = sorted(set((old.get("strengths") or []) + (t.get("strengths") or [])))
            old["best_for"] = sorted(set((old.get("best_for") or []) + (t.get("best_for") or [])))
            old["tags"] = sorted(set((old.get("tags") or []) + (t.get("tags") or [])))
            # keep better reliability/popularity if higher
            for fld in ["reliability_score","popularity_score"]:
                if t.get(fld,0) > old.get(fld,0):
                    old[fld] = t[fld]
        else:
            seen[key] = t
            out.append(t)
    return out

def load_csv(path:Path)->List[Dict[str,Any]]:
    tools=[]
    with path.open(newline='', encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            row = {k.strip(): (v.strip() if isinstance(v,str) else v) for k,v in row.items()}
            row = norm_tool(row)
            tools.append(row)
    return tools

def load_json(path:Path)->List[Dict[str,Any]]:
    data = json.loads(path.read_text(encoding="utf-8"))
    items = data if isinstance(data,list) else data.get("tools",[])
    return [norm_tool(i) for i in items]

# ---------- seed set (80+ across AI + non-AI) ----------
SEED_TOOLS = [
    # --- AI LLMs / Reasoning ---
    {"name":"Groq Llama-3.1 8B Instant","vendor":"Groq","role":"quality-llm","category":"llm","strengths":["fast","chat","summarize","rewrite"],"best_for":["/fast","/organize"],"pricing":"Free/Paid","latency_ms_est":400,"access_url":"https://api.groq.com"},
    {"name":"Groq Llama-3.1 70B Versatile","vendor":"Groq","role":"quality-llm","category":"llm","strengths":["reasoning","analysis"],"best_for":["/deep"],"pricing":"Free/Paid","latency_ms_est":1100,"access_url":"https://api.groq.com"},
    {"name":"ChatGPT","vendor":"OpenAI","role":"reasoning-chat","category":"llm","strengths":["generalist","examples","step-by-step"],"best_for":["/deep","/creative"],"pricing":"Freemium/Paid","latency_ms_est":1200,"access_url":"https://chat.openai.com"},
    {"name":"Claude","vendor":"Anthropic","role":"long-context-ideation","category":"llm","strengths":["long-context","writing","analysis"],"best_for":["/deep","ideation"],"pricing":"Freemium/Paid","latency_ms_est":1500,"access_url":"https://claude.ai"},
    {"name":"Gemini","vendor":"Google","role":"fast-web-connected","category":"llm","strengths":["web-search","factual","multimodal"],"best_for":["/live","research"],"pricing":"Freemium/Paid","latency_ms_est":900,"access_url":"https://aistudio.google.com"},
    {"name":"Perplexity","vendor":"Perplexity","role":"answer-engine","category":"search","strengths":["web-citations","fresh-info"],"best_for":["/live","research-synthesis"],"pricing":"Freemium/Paid","latency_ms_est":1200,"access_url":"https://www.perplexity.ai"},

    # --- Dev / Code ---
    {"name":"GitHub Copilot","vendor":"GitHub","role":"code-assistant","category":"code","strengths":["autocomplete","refactor","tests"],"best_for":["code","/creative"],"pricing":"Paid","latency_ms_est":700,"access_url":"https://github.com/features/copilot","integration_type":"plugin","tags":["vscode","jetbrains"]},
    {"name":"Amazon CodeWhisperer","vendor":"AWS","role":"code-assistant","category":"code","strengths":["cloud-integrations","security-scans"],"best_for":["enterprise","code"],"pricing":"Freemium/Paid","latency_ms_est":900,"access_url":"https://aws.amazon.com/codewhisperer/","integration_type":"plugin"},
    {"name":"Visual Studio Code","vendor":"Microsoft","role":"ide","category":"ide","strengths":["editor","extensions"],"best_for":["code"],"pricing":"Free","latency_ms_est":600,"access_url":"https://code.visualstudio.com/","integration_type":"desktop"},
    {"name":"GitHub","vendor":"GitHub","role":"git-hosting","category":"devops","strengths":["scm","issues","actions"],"best_for":["/organize","code"],"pricing":"Freemium/Paid","latency_ms_est":800,"access_url":"https://github.com"},
    {"name":"Jira","vendor":"Atlassian","role":"project-management","category":"pm","strengths":["scrum","kanban"],"best_for":["/organize","enterprise"],"pricing":"Paid","latency_ms_est":1000,"access_url":"https://www.atlassian.com/software/jira"},
    {"name":"Linear","vendor":"Linear","role":"project-management","category":"pm","strengths":["issues","roadmap"],"best_for":["/organize"],"pricing":"Paid","latency_ms_est":900,"access_url":"https://linear.app"},

    # --- Creative / Design ---
    {"name":"Figma","vendor":"Figma","role":"ui-design","category":"design","strengths":["collaboration","prototyping"],"best_for":["/creative"],"pricing":"Freemium/Paid","latency_ms_est":900,"access_url":"https://www.figma.com"},
    {"name":"Adobe Photoshop","vendor":"Adobe","role":"image-editing","category":"image","strengths":["retouch","layers"],"best_for":["/creative"],"pricing":"Paid","latency_ms_est":1400,"access_url":"https://www.adobe.com/products/photoshop.html"},
    {"name":"Adobe Illustrator","vendor":"Adobe","role":"vector-design","category":"image","strengths":["vector","branding"],"best_for":["/creative"],"pricing":"Paid","latency_ms_est":1400,"access_url":"https://www.adobe.com/products/illustrator.html"},
    {"name":"Canva","vendor":"Canva","role":"design-suite","category":"design","strengths":["templates","social"],"best_for":["marketing","/creative"],"pricing":"Freemium/Paid","latency_ms_est":800,"access_url":"https://www.canva.com"},
    {"name":"Runway Gen-3","vendor":"Runway","role":"video-generation","category":"video","strengths":["text-to-video"],"best_for":["/creative","marketing-video"],"pricing":"Paid","latency_ms_est":3000,"access_url":"https://runwayml.com"},
    {"name":"Premiere Pro","vendor":"Adobe","role":"video-editing","category":"video","strengths":["timeline","color","audio"],"best_for":["/creative"],"pricing":"Paid","latency_ms_est":2500,"access_url":"https://www.adobe.com/products/premiere.html"},

    # --- Architecture / CAD / Engineering ---
    {"name":"AutoCAD","vendor":"Autodesk","role":"dwg-cad","category":"cad","strengths":["drafting","dwg"],"best_for":["architecture","mechanical"],"pricing":"Paid","latency_ms_est":1800,"access_url":"https://www.autodesk.com/products/autocad","integration_type":"desktop"},
    {"name":"Revit","vendor":"Autodesk","role":"bim","category":"cad","strengths":["BIM","parametric"],"best_for":["architecture"],"pricing":"Paid","latency_ms_est":2200,"access_url":"https://www.autodesk.com/products/revit","integration_type":"desktop"},
    {"name":"SolidWorks","vendor":"Dassault Systèmes","role":"mechanical-cad","category":"cad","strengths":["3d-cad","simulation"],"best_for":["mechanical"],"pricing":"Paid","latency_ms_est":2200,"access_url":"https://www.solidworks.com"},
    {"name":"SketchUp","vendor":"Trimble","role":"3d-modeling","category":"cad","strengths":["architectural-3d","easy"],"best_for":["architecture"],"pricing":"Paid","latency_ms_est":1500,"access_url":"https://www.sketchup.com"},
    {"name":"Blender","vendor":"Blender Foundation","role":"3d-suite","category":"cad","strengths":["modeling","rendering","python"],"best_for":["/creative","animation"],"pricing":"Free","latency_ms_est":1500,"access_url":"https://www.blender.org"},

    # --- Office / PDF / Document ---
    {"name":"Adobe Acrobat Reader","vendor":"Adobe","role":"pdf-reader","category":"pdf","strengths":["view","comment"],"best_for":["office"],"pricing":"Free","latency_ms_est":600,"access_url":"https://get.adobe.com/reader/","integration_type":"desktop"},
    {"name":"Adobe Acrobat Pro","vendor":"Adobe","role":"pdf-editor","category":"pdf","strengths":["edit","ocr","e-sign"],"best_for":["office","legal"],"pricing":"Paid","latency_ms_est":900,"access_url":"https://www.adobe.com/acrobat.html"},
    {"name":"Microsoft Word","vendor":"Microsoft","role":"word-processor","category":"office","strengths":["docs","track-changes"],"best_for":["office"],"pricing":"Paid","latency_ms_est":700,"access_url":"https://www.microsoft.com/microsoft-365/word"},
    {"name":"Microsoft Excel","vendor":"Microsoft","role":"spreadsheets","category":"office","strengths":["analysis","formulas"],"best_for":["finance","data"],"pricing":"Paid","latency_ms_est":700,"access_url":"https://www.microsoft.com/microsoft-365/excel"},
    {"name":"Google Docs","vendor":"Google","role":"docs","category":"office","strengths":["collaboration","comments"],"best_for":["office"],"pricing":"Free","latency_ms_est":700,"access_url":"https://docs.google.com"},
    {"name":"Google Sheets","vendor":"Google","role":"spreadsheets","category":"office","strengths":["tables","automation"],"best_for":["/organize"],"pricing":"Free","latency_ms_est":600,"access_url":"https://sheets.google.com"},

    # --- Data / BI / ETL ---
    {"name":"Notion","vendor":"Notion","role":"knowledge-base","category":"productivity","strengths":["wiki","db","notes"],"best_for":["/organize"],"pricing":"Freemium/Paid","latency_ms_est":900,"access_url":"https://www.notion.so"},
    {"name":"Airtable","vendor":"Airtable","role":"no-code-db","category":"data","strengths":["tables","automation"],"best_for":["ops","/organize"],"pricing":"Freemium/Paid","latency_ms_est":900,"access_url":"https://airtable.com"},
    {"name":"Zapier","vendor":"Zapier","role":"automation","category":"automation","strengths":["workflow","connectors"],"best_for":["ops","/organize"],"pricing":"Freemium/Paid","latency_ms_est":1200,"access_url":"https://zapier.com"},
    {"name":"Make (Integromat)","vendor":"Make","role":"automation","category":"automation","strengths":["visual-flows"],"best_for":["ops"],"pricing":"Freemium/Paid","latency_ms_est":1200,"access_url":"https://www.make.com"},
    {"name":"Power BI","vendor":"Microsoft","role":"bi","category":"viz","strengths":["dashboards","DAX"],"best_for":["data"],"pricing":"Paid","latency_ms_est":1300,"access_url":"https://powerbi.microsoft.com"},
    {"name":"Tableau","vendor":"Salesforce","role":"bi","category":"viz","strengths":["dashboards","visual-analytics"],"best_for":["data"],"pricing":"Paid","latency_ms_est":1500,"access_url":"https://www.tableau.com"},

    # --- Enterprise / CRM / ERP / PM ---
    {"name":"Salesforce","vendor":"Salesforce","role":"crm","category":"crm","strengths":["sales","service"],"best_for":["enterprise"],"pricing":"Paid","latency_ms_est":1400,"access_url":"https://www.salesforce.com"},
    {"name":"HubSpot","vendor":"HubSpot","role":"crm","category":"crm","strengths":["marketing","automation"],"best_for":["marketing"],"pricing":"Freemium/Paid","latency_ms_est":1200,"access_url":"https://www.hubspot.com"},
    {"name":"Asana","vendor":"Asana","role":"project-management","category":"pm","strengths":["tasks","calendar"],"best_for":["/organize"],"pricing":"Freemium/Paid","latency_ms_est":1000,"access_url":"https://asana.com"},
    {"name":"Trello","vendor":"Atlassian","role":"kanban","category":"pm","strengths":["boards","powerups"],"best_for":["/organize"],"pricing":"Freemium/Paid","latency_ms_est":900,"access_url":"https://trello.com"},

    # --- Communication / Collab ---
    {"name":"Slack","vendor":"Salesforce","role":"messaging","category":"communication","strengths":["channels","apps"],"best_for":["ops"],"pricing":"Freemium/Paid","latency_ms_est":800,"access_url":"https://slack.com"},
    {"name":"Microsoft Teams","vendor":"Microsoft","role":"video-call","category":"communication","strengths":["meetings","chat"],"best_for":["enterprise"],"pricing":"Paid","latency_ms_est":900,"access_url":"https://www.microsoft.com/microsoft-teams"},
    {"name":"Zoom","vendor":"Zoom","role":"video-call","category":"communication","strengths":["meetings","webinars"],"best_for":["enterprise"],"pricing":"Freemium/Paid","latency_ms_est":900,"access_url":"https://zoom.us"},

    # --- Image/Video/Audio Gen ---
    {"name":"Stability SDXL","vendor":"Stability AI","role":"image-generation","category":"image","strengths":["illustration","concept-art"],"best_for":["/creative"],"pricing":"Free/Paid","latency_ms_est":2200,"access_url":"https://platform.stability.ai"},
    {"name":"DALL·E","vendor":"OpenAI","role":"image-generation","category":"image","strengths":["photoreal","branding"],"best_for":["/creative"],"pricing":"Paid","latency_ms_est":1800,"access_url":"https://platform.openai.com"},
    {"name":"CapCut","vendor":"ByteDance","role":"video-editing","category":"video","strengths":["templates","social"],"best_for":["/creative"],"pricing":"Freemium/Paid","latency_ms_est":1600,"access_url":"https://www.capcut.com"},

    # --- Speech / OCR ---
    {"name":"Whisper","vendor":"OpenAI","role":"speech-to-text","category":"stt","strengths":["transcription","multilingual"],"best_for":["/organize","meeting-notes"],"pricing":"Paid","latency_ms_est":1400,"access_url":"https://platform.openai.com"},
    {"name":"ElevenLabs","vendor":"ElevenLabs","role":"text-to-speech","category":"tts","strengths":["realistic-voice"],"best_for":["/creative","podcast"],"pricing":"Freemium/Paid","latency_ms_est":1000,"access_url":"https://elevenlabs.io"},
    {"name":"Tesseract OCR","vendor":"Open Source","role":"ocr","category":"utilities","strengths":["ocr","pdf"],"best_for":["office"],"pricing":"Free","latency_ms_est":900,"access_url":"https://github.com/tesseract-ocr/tesseract"},

    # --- Databases / Search / RAG ---
    {"name":"Pinecone","vendor":"Pinecone","role":"vector-db","category":"vector-db","strengths":["RAG","semantic-search"],"best_for":["/organize","knowledge-base"],"pricing":"Freemium/Paid","latency_ms_est":800,"access_url":"https://www.pinecone.io"},
    {"name":"Elasticsearch","vendor":"Elastic","role":"search","category":"search","strengths":["full-text","analytics"],"best_for":["data"],"pricing":"Freemium/Paid","latency_ms_est":900,"access_url":"https://www.elastic.co"},
    {"name":"PostgreSQL","vendor":"PostgreSQL","role":"database","category":"db","strengths":["sql","extensions"],"best_for":["data"],"pricing":"Free","latency_ms_est":700,"access_url":"https://www.postgresql.org"}
]

def load_sources()->List[Dict[str,Any]]:
    tools = [norm_tool(t) for t in SEED_TOOLS]
    SRC_DIR.mkdir(parents=True, exist_ok=True)
    for path in glob.glob(str(SRC_DIR / "*")):
        p = Path(path)
        try:
            if p.suffix.lower() == ".csv":
                tools += load_csv(p)
            elif p.suffix.lower() in (".json",".ndjson"):
                tools += load_json(p)
        except Exception as e:
            print(f"[warn] failed to load {p.name}: {e}")
    return tools

def main():
    # optional: validate schema presence
    if not SCHEMA_PATH.exists():
        print("[warn] ToolBase_Schema.json not found; continuing.")

    tools = load_sources()
    tools = [norm_tool(t) for t in tools]
    tools = dedupe(tools)

    out = {
        "version": "3.0",
        "updated": NOW,
        "count": len(tools),
        "notes": "Generated by tools/generate_toolbase.py",
        "tools": tools
    }
    OUT_PATH.write_text(json.dumps(out, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"[ok] wrote {OUT_PATH} with {len(tools)} tools.")

if __name__ == "__main__":
    main()
