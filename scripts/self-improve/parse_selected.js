const fs = require("fs");
const path = require("path");

function main() {
  const filePath = path.join(process.cwd(), "selected.json");
  if (!fs.existsSync(filePath)) {
    console.error("selected.json not found at", filePath);
    process.exit(1);
  }

  const raw = fs.readFileSync(filePath, "utf8");
  const j = JSON.parse(raw);
  const s = j.selected || {};

  const lines = [
    `improvement_id=${s.id || ""}`,
    `improvement_title=${(s.title || "").replace(/\r?\n/g, " ")}`,
    `improvement_description=${(s.description || "").replace(/\r?\n/g, " ")}`,
    `improvement_status=${s.status || ""}`,
  ];

  for (const line of lines) {
    console.log(line);
  }
}

main();
