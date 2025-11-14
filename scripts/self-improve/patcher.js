const fs = require("fs");
const path = require("path");

function main() {
  const id = process.env.improvement_id;
  const title = process.env.improvement_title;

  if (!id) {
    console.error("No improvement_id found in environment.");
    process.exit(1);
  }

  const patchesDir = path.join(__dirname, "..", "..", "patches");
  if (!fs.existsSync(patchesDir)) {
    fs.mkdirSync(patchesDir);
  }

  const filePath = path.join(patchesDir, `${id}.patch`);

  // Placeholder patch (safe no-op patch)
  // Later we insert real refactor logic.
  const patch = `
diff --git a/README.md b/README.md
index e69de29..4b825dc 100644
--- a/README.md
+++ b/README.md
@@ -0,0 +1,5 @@
+# Auto Improvement Patch
+
+This patch was generated for improvement:
+- ID: ${id}
+- Title: ${title}
  `;

  fs.writeFileSync(filePath, patch.trimStart(), "utf8");

  console.log("Patch created:");
  console.log(filePath);
}

main();
