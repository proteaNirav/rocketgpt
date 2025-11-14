// scripts/self-improve/write_status.js
const fs = require("fs");
const path = require("path");

function main() {
  const status = {
    improvement_id: process.env.improvement_id || null,
    title: process.env.improvement_title || null,
    description: process.env.improvement_description || null,
    improvement_status: process.env.improvement_status || null,
    mode: process.env.SELF_IMPROVE_MODE || "simulation",
    last_update: new Date().toISOString(),
    github: {
      run_id: process.env.GITHUB_RUN_ID || null,
      run_number: process.env.GITHUB_RUN_NUMBER || null,
      workflow: process.env.GITHUB_WORKFLOW || null,
      ref: process.env.GITHUB_REF || null,
      ref_name: process.env.GITHUB_REF_NAME || null,
      sha: process.env.GITHUB_SHA || null,
      event_name: process.env.GITHUB_EVENT_NAME || null,
    },
  };

  const outPath = path.join(process.cwd(), "self_improve_status.json");
  fs.writeFileSync(outPath, JSON.stringify(status, null, 2), "utf8");
  console.log(`Self-Improve status written to: ${outPath}`);
  console.log(JSON.stringify(status, null, 2));
}

main();
