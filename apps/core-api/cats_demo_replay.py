import json
import os
import subprocess
import sys
import argparse
from pathlib import Path

VALID_DEMO_DENY_REASONS = {"expired", "digest", "registry", "passport"}


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("cat_id")
    ap.add_argument("json_input", nargs="?")
    ap.add_argument(
        "--deny",
        choices=sorted(VALID_DEMO_DENY_REASONS),
        help="Force demo denial status in replay artifact",
    )
    ap.add_argument(
        "--renew",
        action="store_true",
        help="Generate demo renewal request artifact instead of stub CAT output",
    )
    args = ap.parse_args()

    cat_id = args.cat_id
    payload = {"demo": True}
    if args.json_input is not None:
        try:
            payload = json.loads(args.json_input)
        except json.JSONDecodeError as exc:
            print(f"Invalid JSON payload: {exc}", file=sys.stderr)
            return 2

    contract = Path(__file__).resolve().parent / "replay" / "replay_contract.cats_demo.json"

    data = json.loads(contract.read_text(encoding="utf-8"))

    # Patch replay.inputs dynamically (this matches replay_runner expectations)
    data["replay"]["inputs"]["cat_id"] = cat_id
    data["replay"]["inputs"]["payload_json"] = json.dumps(payload, separators=(",", ":"))
    if args.deny:
        data["replay"]["inputs"]["demo_deny"] = args.deny
    else:
        data["replay"]["inputs"].pop("demo_deny", None)
    if args.renew:
        data["replay"]["inputs"]["demo_renew"] = True
    else:
        data["replay"]["inputs"].pop("demo_renew", None)

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
