import { runScan, proposeForFinding, validateStoredProposal, listFindings, listProposals } from "./orchestrator.mjs";
import { executeProposal } from "./executor.mjs";

function parseArgs(argv) {
  const out = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const token = argv[i];
    if (token.startsWith("--")) {
      const key = token.slice(2);
      const next = argv[i + 1];
      if (!next || next.startsWith("--")) {
        out[key] = true;
      } else {
        out[key] = next;
        i += 1;
      }
    } else {
      out._.push(token);
    }
  }
  return out;
}

export async function cli(argv) {
  const args = parseArgs(argv);
  const cmd = args._[0];
  const actor = args.actor || "service:self-improve";
  const enabled = ["1", "true", "yes"].includes(String(process.env.SELF_IMPROVE_ENABLED || "").toLowerCase());
  if (["scan", "propose", "validate", "execute"].includes(String(cmd)) && !enabled) {
    throw new Error("SELF_IMPROVE_ENABLED is false.");
  }
  if (cmd === "scan") {
    const result = await runScan({
      actor,
      ciArtifactPath: args["ci-artifact"] || "",
      policyArtifactPaths: args["policy-artifacts"] ? String(args["policy-artifacts"]).split(",") : [],
      replayArtifactPath: args["replay-artifact"] || "",
    });
    return result;
  }
  if (cmd === "propose") {
    if (!args.finding) throw new Error("--finding is required");
    return proposeForFinding({ findingId: String(args.finding), actor });
  }
  if (cmd === "validate") {
    if (!args.proposal) throw new Error("--proposal is required");
    return validateStoredProposal({ proposalId: String(args.proposal), actor });
  }
  if (cmd === "execute") {
    if (!args.proposal) throw new Error("--proposal is required");
    return executeProposal({
      proposalId: String(args.proposal),
      actor,
      dryRun: Boolean(args["dry-run"]),
    });
  }
  if (cmd === "findings") {
    return { findings: await listFindings() };
  }
  if (cmd === "proposals") {
    return { proposals: await listProposals() };
  }
  if (cmd === "verify") {
    return { ok: true, check: args.check || "none" };
  }
  throw new Error(`Unknown command: ${cmd}`);
}

if (process.argv[1] && process.argv[1].replace(/\\/g, "/").endsWith("/apps/core-api/self_improve/index.mjs")) {
  cli(process.argv.slice(2))
    .then((result) => {
      process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    })
    .catch((error) => {
      process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
      process.exit(1);
    });
}
