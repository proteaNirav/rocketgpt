const fs = require("fs");
const path = require("path");

function loadBacklog() {
  const backlogPath = path.join(__dirname, "..", "..", "config", "self_improve_backlog.json");
  if (!fs.existsSync(backlogPath)) {
    console.error(`Backlog file not found at: ${backlogPath}`);
    process.exit(1);
  }

  const raw = fs.readFileSync(backlogPath, "utf8");

  // Strip UTF-8 BOM if present
  const cleaned = raw.replace(/^\uFEFF/, "");

  try {
    const data = JSON.parse(cleaned);
    if (!Array.isArray(data.backlog)) {
      throw new Error("Expected 'backlog' to be an array");
    }
    return { data, backlogPath };
  } catch (err) {
    console.error("Failed to parse backlog JSON:", err.message);
    process.exit(1);
  }
}

function priorityScore(priority) {
  switch ((priority || "").toLowerCase()) {
    case "high":
      return 3;
    case "medium":
      return 2;
    case "low":
      return 1;
    default:
      return 0;
  }
}

function selectNext(backlog) {
  const candidates = backlog.filter(
    (item) => (item.status || "").toLowerCase() === "pending"
  );

  if (candidates.length === 0) {
    return null;
  }

  candidates.sort((a, b) => {
    const pa = priorityScore(a.priority);
    const pb = priorityScore(b.priority);
    if (pa !== pb) {
      return pb - pa;
    }

    const ca = new Date(a.created_at || 0).getTime();
    const cb = new Date(b.created_at || 0).getTime();
    return ca - cb;
  });

  return candidates[0];
}

function main() {
  const { data, backlogPath } = loadBacklog();
  const backlog = data.backlog;

  const selected = selectNext(backlog);

  if (!selected) {
    const result = {
      ok: false,
      reason: "no_pending_items",
      message: "No pending improvements in backlog"
    };
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  if ((selected.status || "").toLowerCase() === "pending") {
    selected.status = "in_progress";
    selected.started_at = new Date().toISOString();
  }

  fs.writeFileSync(backlogPath, JSON.stringify(data, null, 2) + "\n", "utf8");

  const result = {
    ok: true,
    selected
  };

  console.log(JSON.stringify(result, null, 2));
}

main();
