module.exports = async function () {
  console.log("Running sample test from Orchestrator → Tester test-tester route...");
  if (3 * 3 !== 9) {
    throw new Error("Math logic failed in orchestrator test route");
  }
};