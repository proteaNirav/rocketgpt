import { execSync } from 'node:child_process'

function sh(cmd) {
  return execSync(cmd, { stdio: ['ignore', 'pipe', 'pipe'] })
    .toString()
    .trim()
}

const base = process.env.VERCEL_GIT_PREVIOUS_SHA
const head = process.env.VERCEL_GIT_COMMIT_SHA

// 🔑 CRITICAL FIX:
// If SHAs are missing, SKIP the build.
// This happens frequently in Preview / PR deployments.
if (!base || !head) {
  console.log('[vercel-ignore] Missing git SHAs → skipping build')
  process.exit(0) // ← skip build
}

const diff = sh(`git diff --name-only ${base} ${head}`)
const files = diff.split('\n').filter(Boolean)

// Allowlist: changes that should NOT trigger build
const onlyNonAppChanges =
  files.length > 0 &&
  files.every(
    (f) =>
      f.startsWith('docs/') ||
      f.startsWith('.github/') ||
      f.startsWith('tools/') ||
      f === 'README.md',
  )

if (onlyNonAppChanges) {
  console.log('[vercel-ignore] Non-app changes detected → skipping build')
  process.exit(0) // skip build
}

// Otherwise, build is required
console.log('[vercel-ignore] App changes detected → running build')
process.exit(1)
