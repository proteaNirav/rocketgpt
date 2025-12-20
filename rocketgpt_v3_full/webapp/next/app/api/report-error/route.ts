// app/api/report-error/route.ts
import { NextRequest, NextResponse } from "next/server";

const OWNER  = process.env.GITHUB_OWNER!;
const REPO   = process.env.GITHUB_REPO!;
const GH_PAT = process.env.GH_PAT!;  // injected PAT

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const {
      title = "Production Error",
      stack = "",
      url = "",
      note = "",
      engine = "anthropic",         // default reviewer/codegen engine
      goal = "Fix the error seen in production",
    } = body || {};

    // Minimal spec block the triage/codegen understands
    const spec = {
      engine,
      goal,
      acceptance: [
        "Reproduce and fix the error",
        "Add a unit test to prevent regression",
        "Update README/CHANGELOG if needed"
      ],
    };

    const issueBody =
`Source: **rocketgpt.dev**
URL: ${url || "n/a"}
Note: ${note || "n/a"}

\`\`\`json
${JSON.stringify(spec, null, 2)}
\`\`\`

<details><summary>Stack</summary>

\`\`\`
${stack || "no stack"}
\`\`\`

</details>`;

    // Create the issue
    const res = await fetch(`https://api.github.com/repos/${OWNER}/${REPO}/issues`, {
      method: "POST",
      headers: {
        "Authorization": `token ${GH_PAT}`,
        "Accept": "application/vnd.github+json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        title,
        body: issueBody,
        labels: ["self-apply", "codegen:ready"], // ← triggers triage → codegen
      }),
      cache: "no-store",
    });

    if (!res.ok) {
      const t = await res.text();
      return NextResponse.json({ ok: false, error: `GitHub: ${res.status} ${t}` }, { status: 500 });
    }

    const created = await res.json();
    return NextResponse.json({ ok: true, issue_number: created.number, url: created.html_url });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: String(err?.message || err) }, { status: 500 });
  }
}
