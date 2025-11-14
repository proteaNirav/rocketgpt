#!/usr/bin/env node

// Simple UI healer for RocketGPT v3_full

const { execSync } = require("node:child_process");
const process = require("node:process");

function run(cmd) {
  return execSync(cmd, { encoding: "utf-8" }).trim();
}

function getEnv(name, required = true) {
  const v = process.env[name];
  if (!v || v === "") {
    if (required) {
      console.error(`Missing required env: ${name}`);
      process.exit(1);
    }
    return "";
  }
  return v;
}

async function main() {
  const args = process.argv.slice(2);
  const getArg = (flag) => {
    const idx = args.indexOf(flag);
    return idx >= 0 ? args[idx + 1] : "";
  };

  const base = getArg("--base") || run("git merge-base HEAD origin/main");
  const head = getArg("--head") || "HEAD";
  const prNumber = getArg("--pr");

  const OPENAI_API_KEY = getEnv("OPENAI_API_KEY", false);
  const ***REMOVED***"GITHUB_TOKEN", false);
  const GITHUB_REPOSITORY = getEnv("GITHUB_REPOSITORY", false);

  if (!prNumber) {
    console.log("No PR number provided, skipping UI healer.");
    return;
  }

  // 1) Collect diff for UI-related files in v3_full
  const diff = run(
    `git diff ${base} ${head} -- rocketgpt_v3_full/webapp/next`
  );

  if (!diff) {
    console.log("No UI diff to heal. Exiting.");
    return;
  }

  // 2) Build a compact prompt with opinionated UI rules
  const prompt = `
You are RocketGPT's UI Healer. You review diffs of the Next.js app in "rocketgpt_v3_full/webapp/next" and suggest minimal improvements.

Rules:
- Keep all business logic and data flow as-is.
- Only adjust layout, spacing, typography, and Tailwind class usage.
- Enforce:
  - max-w-3xl / max-w-4xl for main content containers
  - mx-auto for centered layout
  - Consistent vertical rhythm using Tailwind spacing (e.g., space-y-4 / space-y-6)
  - Buttons: rounded-lg, font-medium, px-4 py-2
  - Cards: rounded-xl, shadow-sm, border, p-4 or p-6
- Avoid introducing new dependencies.
- Prefer className changes over structural reshuffles.

Input:
\`\`\`diff
${diff}
\`\`\`

Output format (very important):
1) Short summary of UI issues found.
2) Bullet list of suggested changes.
3) Patch suggestions per file, in \`\`\`diff ... \`\`\` fences that can be applied with git apply.
`;

  if (!OPENAI_API_KEY) {
    console.log("OPENAI_API_KEY not set. Will just log the prompt for debugging.");
    console.log(prompt.substring(0, 4000));
    return;
  }

  // 3) Call OpenAI (model can be adjusted later)
  const body = {
    model: "gpt-4.1-mini",
    messages: [
      {
        role: "system",
        content: "You are a senior frontend engineer and UI healer for RocketGPT."
      },
      { role: "user", content: prompt }
    ]
  };

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${OPENAI_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });

  if (!res.ok) {
    console.error("OpenAI API call failed:", await res.text());
    process.exit(1);
  }

  const json = await res.json();
  const content =
    json.choices?.[0]?.message?.content || "UI healer could not produce a response.";

  // 4) Post a PR comment with findings
  if (GITHUB_TOKEN && GITHUB_REPOSITORY) {
    const commentBody = {
      body: [
        "### 🤖 RocketGPT UI Healer Report",
        "",
        content,
        "",
        "_This comment was generated automatically by the UI Healer workflow._"
      ].join("\n")
    };

    const apiUrl = `https://api.github.com/repos/${GITHUB_REPOSITORY}/issues/${prNumber}/comments`;

    const commentRes = await fetch(apiUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${GITHUB_TOKEN}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(commentBody)
    });

    if (!commentRes.ok) {
      console.error("Failed to post PR comment:", await commentRes.text());
    } else {
      console.log("UI Healer comment posted to PR", prNumber);
    }
  } else {
    console.log("GITHUB_TOKEN or GITHUB_REPOSITORY missing; printing output instead:");
    console.log(content);
  }
}

main().catch((err) => {
  console.error("UI healer failed:", err);
  process.exit(1);
});
