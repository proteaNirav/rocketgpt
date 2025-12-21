import { execSync } from "node:child_process";

function sh(cmd) {
  return execSync(cmd, { stdio: ["ignore", "pipe", "pipe"] }).toString().trim();
}

const base = process.env.VERCEL_GIT_PREVIOUS_SHA;
const head = process.env.VERCEL_GIT_COMMIT_SHA;

if (!base || !head) {
  // If we can't detect SHAs, do not skip build.
  process.exit(1);
}

const diff = sh(`git diff --name-only ${base} ${head}`);
const files = diff.split("\n").filter(Boolean);

// Allowlist only-doc changes to skip builds
const onlyDocs = files.length > 0 && files.every(f =>
  f.startsWith("docs/") ||
  f.startsWith(".github/") ||
  f === "README.md"
);

// IMPORTANT: In Vercel, exit 0 means "Ignore build" (skip),
// exit 1 means "Do build".
process.exit(onlyDocs ? 0 : 1);
