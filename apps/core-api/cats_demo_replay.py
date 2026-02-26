import json
import os
import subprocess
import sys
from pathlib import Path

def main() -> int:
    if len(sys.argv) < 2:
        print("Usage: python cats_demo_replay.py <RGPT-CAT-XX> [jsonInput]")
        return 2

    cat_id = sys.argv[1]
    payload = {"demo": True}
    if len(sys.argv) >= 3:
        payload = json.loads(sys.argv[2])

    repo_root = Path(__file__).resolve().parents[2]
    contract = Path(__file__).resolve().parent / "replay" / "replay_contract.cats_demo.json"

    # Patch contract inputs dynamically (no jq dependency)
    data = json.loads(contract.read_text(encoding="utf-8"))
    data["inputs"]["cat_id"] = cat_id
    data["inputs"]["payload_json"] = json.dumps(payload, separators=(",", ":"))

    tmp_contract = Path(os.getenv("TEMP", ".")) / f"replay_contract.cats_demo.{cat_id}.json"
    tmp_contract.write_text(json.dumps(data, indent=2), encoding="utf-8")

    # Run existing replay module
    cmd = [sys.executable, "-m", "replay", "--contract", str(tmp_contract)]
    print("Running:", " ".join(cmd))
    p = subprocess.run(cmd)
    return p.returncode

if __name__ == "__main__":
    raise SystemExit(main())
