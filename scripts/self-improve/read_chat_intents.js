"use strict";

const fs = require("fs");
const path = require("path");

/**
 * Read chat intents from config/self-improve/chat_intents.jsonl
 * Returns an array of { timestamp, from, intent }
 */
function readChatIntents() {
  const filePath = path.resolve(__dirname, "..", "..", "config", "self-improve", "chat_intents.jsonl");

  if (!fs.existsSync(filePath)) {
    console.error("[chat-intents] Inbox file not found:", filePath);
    return [];
  }

  const raw = fs.readFileSync(filePath, "utf8");
  const lines = raw.split(/\r?\n/).filter((l) => l.trim().length > 0);

  const intents = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith("#")) continue; // skip comment header

    try {
      const obj = JSON.parse(trimmed);
      if (obj && obj.intent) {
        intents.push(obj);
      }
    } catch (err) {
      console.warn("[chat-intents] Failed to parse line:", trimmed);
    }
  }

  return intents;
}

// If run directly: print a small summary
if (require.main === module) {
  const intents = readChatIntents();
  console.log(
    JSON.stringify(
      {
        source: "config/self-improve/chat_intents.jsonl",
        count: intents.length,
        intents,
      },
      null,
      2
    )
  );
}

module.exports = { readChatIntents };
