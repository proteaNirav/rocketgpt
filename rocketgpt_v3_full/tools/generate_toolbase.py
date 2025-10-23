#!/usr/bin/env python3
"""
RocketGPT ToolBase builder

Generate ToolBase.json by merging all CSV packs in tools/sources/.

- Normalizes list-ish columns (strengths, best_for, tags)
- Coerces numbers (latency_ms_est, reliability_score, popularity_score)
- Dedupes by (name,vendor) and merges list fields
- Prints per-file counts + final summary
"""

import csv
import glob
import json
import os
import sys
from datetime import datetime

ROOT = os.path.dirname(os.path.abspath(__file__))
SRC_DIR = os.path.join(ROOT, "sources")
OUT_PATH = os.path.join(os.path.dirname(ROOT), "tools", "ToolBase.json")

REQUIRED = [
    "name", "vendor", "role", "domain", "category", "sub_category",
    "pricing", "access_url", "integration_type"
]

LIST_FIELDS = ["strengths", "best_for", "tags"]
NUM_INT_FIELDS = ["latency_ms_est"]
NUM_FLOAT_FIELDS = ["reliability_score", "popularity_score"]

PRICING_CANON = {
    "free": "Free",
    "paid": "Paid",
    "freemium": "Freemium/Paid",
    "free/paid": "Free/Paid",
    "freemium/paid": "Freemium/Paid",
}

def split_listish(v):
    """Turn 'a|b,c' or 'a, b | c' -> ['a','b','c'] ; keep [] for blanks."""
    if v is None:
        return []
    if isinstance(v, list):
        return [x.strip() for x in v if str(x).strip()]
    s = str(v).strip()
    if not s:
        return []
    # support both '|' and ',' as separators
    parts = []
    for chunk in s.replace(",", "|").split("|"):
        chunk = chunk.strip()
        if chunk:
            parts.append(chunk)
    return parts

def to_int(v, default=0):
    try:
        return int(float(v))
    except Exception:
        return default

def to_float(v, default=0.0):
    try:
        return float(v)
    except Exception:
        return default

def canon_pricing(v):
    if not v:
        return "Free/Paid"
    s = str(v).strip().lower()
    return PRICING_CANON.get(s, PRICING_CANON.get(s.replace(" ", ""), v))

def load_csv(path):
    rows = []
    with open(path, "r", encoding="utf-8-sig") as f:
        rdr = csv.DictReader(f)
        for raw in rdr:
            row = {k.strip(): (raw.get(k) or "").strip() for k in rdr.fieldnames}

            # Normalize list fields
            for lf in LIST_FIELDS:
                row[lf] = split_listish(row.get(lf))

            # Numbers
            for nf in NUM_INT_FIELDS:
                row[nf] = to_int(row.get(nf), 900)
            for ff in NUM_FLOAT_FIELDS:
                row[ff] = to_float(row.get(ff), 0.9)

            # Pricing
            row["pricing"] = canon_pricing(row.get("pricing"))

            # Required checks
            missing = [k for k in REQUIRED if not row.get(k)]
            if missing:
                print(f"[warn] {os.path.basename(path)} skipped one row (missing {missing})")
                continue

            rows.append(row)
    return rows

def merge_item(old, new):
    merged = dict(old)
    # prefer non-empty text fields from 'new' if old is empty
    for k, v in new.items():
        if k in LIST_FIELDS:
            merged[k] = sorted(set((merged.get(k) or []) + (v or [])))
        elif k in NUM_INT_FIELDS:
            # keep min latency
            merged[k] = min(to_int(merged.get(k, 99999)), to_int(v, 99999))
        elif k in NUM_FLOAT_FIELDS:
            # keep max score
            merged[k] = max(to_float(merged.get(k, 0)), to_float(v, 0))
        elif k == "pricing":
            # keep most permissive among the two (rough heuristic)
            pref = ["Free", "Free/Paid", "Freemium/Paid", "Paid"]
            try:
                merged[k] = min([merged.get(k, "Paid"), v], key=lambda x: pref.index(canon_pricing(x)))
            except Exception:
                merged[k] = merged.get(k) or v
        else:
            if not merged.get(k) and v:
                merged[k] = v
    return merged

def dedupe(items):
    out = {}
    for t in items:
        key = (t.get("name","").strip(), t.get("vendor","").strip())
        if key in out:
            out[key] = merge_item(out[key], t)
        else:
            out[key] = t
    return list(out.values())

def main():
    if not os.path.isdir(SRC_DIR):
        print(f"[err] sources directory not found: {SRC_DIR}")
        sys.exit(1)

    files = sorted(glob.glob(os.path.join(SRC_DIR, "*.csv")))
    if not files:
        print(f"[err] no CSV files found in {SRC_DIR}")
        sys.exit(1)

    all_rows = []
    print(f"[inf] Loading {len(files)} CSV packs from tools/sources/")
    for fp in files:
        rows = load_csv(fp)
        print(f"  - {os.path.basename(fp):35s} +{len(rows):4d}")
        all_rows.extend(rows)

    tools = dedupe(all_rows)
    tools_sorted = sorted(tools, key=lambda x: (x.get("domain",""), x.get("category",""), x.get("name","").lower()))

    payload = {
        "version": "3.0",
        "generated_at": datetime.utcnow().isoformat() + "Z",
        "count": len(tools_sorted),
        "tools": tools_sorted,
    }

    # Ensure output dir exists
    os.makedirs(os.path.dirname(OUT_PATH), exist_ok=True)
    with open(OUT_PATH, "w", encoding="utf-8") as f:
        json.dump(payload, f, ensure_ascii=False, indent=2)

    print(f"\n[ok] wrote {OUT_PATH}")
    print(f"[ok] total tools: {len(tools_sorted)}")

if __name__ == "__main__":
    main()
