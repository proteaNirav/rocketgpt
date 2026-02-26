import json
import os
import subprocess
import sys
from pathlib import Path


def main() -> int:
    if len(sys.argv) < 2:
        print(
            "Usage: python cats_demo_replay.py <RGPT-CAT-XX> [jsonInput]",
            file=sys.stderr,
        )
        return 2

    cat_id = sys.argv[1]
    payload = {"demo": True}
    if len(sys.argv) >= 3:
        try:
            payload = json.loads(sys.argv[2])
        except json.JSONDecodeError as exc:
            print(f"Invalid JSON payload: {exc}", file=sys.stderr)
            return 2

    contract = Path(__file__).resolve().parent / "replay" / "replay_contract.cats_demo.json"

    data = json.loads(contract.read_text(encoding="utf-8"))

    # Patch replay.inputs dynamically (this matches replay_runner expectations)
    data["replay"]["inputs"]["cat_id"] = cat_id
    data["replay"]["inputs"]["payload_json"] = json.dumps(payload, separators=(",", ":"))

    tmp_contract = Path(os.getenv("TEMP", ".")) / f"replay_contract.cats_demo.{cat_id}.json"
    tmp_contract.write_text(json.dumps(data, indent=2), encoding="utf-8")

    cmd = [sys.executable, "-m", "replay", "--contract", str(tmp_contract)]
    print("Running:", " ".join(cmd))
    p = subprocess.run(cmd, capture_output=True, text=True)
    if p.stdout:
        print(p.stdout, end="")
    if p.stderr:
        print(p.stderr, end="", file=sys.stderr)
    return p.returncode

if __name__ == "__main__":
    raise SystemExit(main())
