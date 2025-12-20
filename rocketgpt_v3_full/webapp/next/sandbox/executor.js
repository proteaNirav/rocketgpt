/**
 * RocketGPT — Test Sandbox Executor
 * Phase 3 (Orchestrator → Tester → Analyzer)
 *
 * Responsibilities:
 *  - Execute test code safely in an isolated child process
 *  - Enforce strict timeout
 *  - Capture stdout, stderr, and structured results
 *  - Return results back to /api/tester/run handler
 */

const { spawn } = require("child_process");
const path = require("path");
const fs = require("fs");

module.exports.runSandbox = async function runSandbox(testRunId, builderOutput) {
  return new Promise((resolve) => {
    const tempDir = path.join(process.cwd(), "sandbox", "runs", testRunId);

    // Ensure directory exists
    fs.mkdirSync(tempDir, { recursive: true });

    // Write builder output files
    if (builderOutput?.files?.length > 0) {
      for (const file of builderOutput.files) {
        const filePath = path.join(tempDir, file.filename);
        fs.writeFileSync(filePath, file.content, "utf8");
      }
    }

    const runnerPath = path.join(process.cwd(), "sandbox", "runner-script.js");

    // Create runner script dynamically if missing
    if (!fs.existsSync(runnerPath)) {
      fs.writeFileSync(
        runnerPath,
        `
          const fs = require('fs');
          const path = require('path');

          async function main() {
            const dir = process.argv[2];
            const summary = [];

            const testFiles = fs.readdirSync(dir).filter(f => f.endsWith('.js'));

            for (const f of testFiles) {
              const filePath = path.join(dir, f);
              const fn = require(filePath);

              const start = Date.now();
              try {
                const res = await fn();
                summary.push({
                  test_case: f,
                  status: "passed",
                  error: null,
                  duration_ms: Date.now() - start
                });
              } catch (err) {
                summary.push({
                  test_case: f,
                  status: "failed",
                  error: err?.message ?? String(err),
                  duration_ms: Date.now() - start
                });
              }
            }

            // IMPORTANT: Final line is pure JSON (for parent parser)
            console.log(JSON.stringify({ status: "success", results: summary }));
          }

          main();
        `,
        "utf8"
      );
    }

    // Spawn the sandboxed child process
    const child = spawn("node", [runnerPath, tempDir], {
      cwd: process.cwd(),
      env: { ...process.env },
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (d) => (stdout += d.toString()));
    child.stderr.on("data", (d) => (stderr += d.toString()));

    // Timeout after 30 seconds
    const timeout = setTimeout(() => {
      child.kill("SIGKILL");
      resolve({
        status: "timeout",
        results: [],
        logs: [stderr, stdout, "Timeout reached (30s)."],
      });
    }, 30000);

    child.on("close", () => {
      clearTimeout(timeout);

      // We may have many lines in stdout (logs + JSON).
      // We will:
      //  - split by line
      //  - take the LAST non-empty line that looks like JSON
      let parsed = null;
      try {
        const all = stdout.trim();
        if (all) {
          const lines = all
            .split("\n")
            .map((l) => l.trim())
            .filter((l) => l.length > 0);

          let jsonLine = null;
          for (let i = lines.length - 1; i >= 0; i--) {
            const line = lines[i];
            if (line.startsWith("{") && line.endsWith("}")) {
              jsonLine = line;
              break;
            }
          }

          if (jsonLine) {
            parsed = JSON.parse(jsonLine);
          }
        }
      } catch (err) {
        // parsing will be handled below
      }

      if (!parsed) {
        return resolve({
          status: "crashed",
          results: [],
          logs: [stderr, stdout, "JSON parse error"],
        });
      }

      resolve({
        status: parsed.status ?? "success",
        results: parsed.results ?? [],
        logs: [stderr, stdout],
      });
    });
  });
};
