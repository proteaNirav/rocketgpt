const fs = require("fs");
const path = require("path");
const { readChatIntents } = require("./read_chat_intents");

function loadSelectedFromFile() {
  try {
    const selectedPath = path.join(__dirname, "..", "..", "selected.json");
    if (!fs.existsSync(selectedPath)) {
      return null;
    }
    const raw = fs.readFileSync(selectedPath, "utf8");
    const cleaned = raw.replace(/^\uFEFF/, "");
    const obj = JSON.parse(cleaned);
    return obj;
  } catch (err) {
    console.warn("Failed to load selected.json:", err.message);
    return null;
  }
}

function main() {
  // 0) Check for --dry-run flag (always safe mode)
  const args = process.argv.slice(2);
  const isDryRun = args.includes("--dry-run") || args.includes("-n");

  // 1) Base data from env (as set by parse_selected.js)
  let id = process.env.improvement_id;
  let title = process.env.improvement_title;
  let desc = process.env.improvement_description;
  let status = process.env.improvement_status;
  let startedAt = process.env.improvement_started_at;
  let priority = process.env.improvement_priority;

  // 2) Fallback: if env is missing (local run), try selected.json
  if (!id) {
    const selectedFromFile = loadSelectedFromFile();
    if (selectedFromFile && selectedFromFile.selected) {
      const s = selectedFromFile.selected;
      id        = s.id || id;
      title     = s.title || title;
      desc      = s.description || desc;
      status    = s.status || status;
      startedAt = s.started_at || startedAt;
      priority  = s.priority || priority;
    }
  }

  // 3) Read chat intents
  const chatIntents = readChatIntents();
  const latestIntent = chatIntents.length > 0 ? chatIntents[chatIntents.length - 1] : null;

  console.log("Self-Improve Executor");
  console.log("=====================");
  console.log("Improvement ID:      ", id || "(unknown)");
  console.log("Title:               ", title || "(no title)");
  console.log("Description:         ", desc || "(no description)");
  console.log("Status:              ", status || "(no status)");
  console.log("Priority:            ", priority || "(unknown)");
  console.log("Started at:          ", startedAt || "(unknown)");
  console.log("");

  console.log("Chat intents summary");
  console.log("--------------------");
  console.log("Total intents:       ", chatIntents.length);
  if (latestIntent) {
    console.log("Latest from:         ", latestIntent.from);
    console.log("Latest at:           ", latestIntent.timestamp);
    console.log("Latest intent:       ", latestIntent.intent);
  } else {
    console.log("No chat intents found.");
  }
  console.log("");

  // 4) Special handling for chat-driven improvement
  if (id === "IMP-0002") {
    console.log("Mode: CHAT-INTENT-DRIVEN IMPROVEMENT (IMP-0002)");
    console.log(
      "Planned behavior: use latest chat intent(s) as primary signal to drive self-improvement tasks (plan, code, tests, docs)."
    );
    console.log(
      "Current stage: controlled mode – can optionally write a plan document when allowed by env flag."
    );
    console.log("");

    const nowIso = new Date().toISOString();
    const latestText = latestIntent ? latestIntent.intent : "(no latest intent)";
    const latestAt = latestIntent ? latestIntent.timestamp : "(n/a)";
    const latestFrom = latestIntent ? latestIntent.from : "(n/a)";

    const planLines = [];
    planLines.push("# Chat-Intent-Driven Improvement Plan");
    planLines.push("");
    planLines.push(`- **Improvement ID:** ${id}`);
    planLines.push(`- **Title:** ${title || "(no title)"}`);
    planLines.push(`- **Priority:** ${priority || "(unknown)"}`);
    planLines.push(`- **Status:** ${status || "(no status)"}`);
    planLines.push(`- **Started at:** ${startedAt || "(unknown)"}`);
    planLines.push(`- **Plan generated at:** ${nowIso}`);
    planLines.push("");
    planLines.push("## Description");
    planLines.push("");
    planLines.push(desc || "(no description)");
    planLines.push("");
    planLines.push("## Latest Chat Intent");
    planLines.push("");
    planLines.push(`- **From:** ${latestFrom}`);
    planLines.push(`- **At:** ${latestAt}`);
    planLines.push(`- **Intent:** ${latestText}`);
    planLines.push("");
    planLines.push("## Next Steps (Draft)");
    planLines.push("");
    planLines.push("1. Parse all chat intents from `config/self-improve/chat_intents.jsonl`.");
    planLines.push("2. Group intents by theme (UI, workflows, safety, performance, UX, etc.).");
    planLines.push("3. Map top chat themes to backlog items (existing or new).");
    planLines.push("4. Update backlog priorities based on recent chat signals.");
    planLines.push("5. (Later) Propose concrete code/doc changes as patches.");
    planLines.push("");
    planLines.push("> NOTE: This document can be written to `docs/self-improve/chat-intent-plan.md` when SELF_IMPROVE_WRITE_PLAN=true.");

    const planDoc = planLines.join("\n");

    console.log("----- Chat-Intent Plan (preview) -----");
    console.log(planDoc);
    console.log("----- End of Chat-Intent Plan (preview) -----");
    console.log("");

    // Optional: write plan to docs when env flag is enabled (unless dry-run)
    const allowWrite = process.env.SELF_IMPROVE_WRITE_PLAN === "true" && !isDryRun;

    if (allowWrite) {
      try {
        const docsDir = path.join(__dirname, "..", "..", "docs", "self-improve");
        if (!fs.existsSync(docsDir)) {
          fs.mkdirSync(docsDir, { recursive: true });
        }
        const outPath = path.join(docsDir, "chat-intent-plan.md");
        fs.writeFileSync(outPath, planDoc + "\n", "utf8");
        console.log(`Plan written to: ${outPath}`);
      } catch (err) {
        console.error("Failed to write chat-intent plan file:", err.message);
      }
      console.log("");
    } else {
      if (isDryRun) {
        console.log("Skipping write to docs/self-improve/chat-intent-plan.md (--dry-run mode).");
      } else {
        console.log("Skipping write to docs/self-improve/chat-intent-plan.md (SELF_IMPROVE_WRITE_PLAN != 'true').");
      }
      console.log("");
    }
  }

  // 5) Simulation mode notice (global)
  if (isDryRun) {
    console.log("Executor running in DRY-RUN mode (no file writes).");
  } else {
    console.log("Executor is in simulation mode (no code changes yet).");
    console.log("Only documentation/plan output is generated when enabled by env flag.");
  }
  console.log("");
}

main();
