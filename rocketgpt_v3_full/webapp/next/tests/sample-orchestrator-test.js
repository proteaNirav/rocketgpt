// Sample orchestrator-level test for RocketGPT Tester.
// This version is CommonJS-friendly and also works when imported via ESM
// using dynamic import + default export mapping.

async function run(context) {
  const logs = [];

  logs.push("[sample-orchestrator-test] Test started.");
  logs.push(
    "[sample-orchestrator-test] Context received: " +
      JSON.stringify(context ?? {}, null, 2)
  );

  const passed = 1;
  const failed = 0;

  logs.push(
    `[sample-orchestrator-test] Marking test as PASSED (passed=${passed}, failed=${failed}).`
  );

  return {
    status: "success",
    passed,
    failed,
    logs,
    artifacts: [],
  };
}

// CommonJS export
module.exports = {
  run,
};
