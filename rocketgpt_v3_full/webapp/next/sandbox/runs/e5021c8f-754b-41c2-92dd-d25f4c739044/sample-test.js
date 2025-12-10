module.exports = async function () {
  console.log("Running sample RocketGPT sandbox test...");
  if (1 + 1 !== 2) {
    throw new Error("Math logic failed");
  }
};