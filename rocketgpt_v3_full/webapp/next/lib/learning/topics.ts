const STOP_WORDS = new Set([
  "the",
  "and",
  "for",
  "with",
  "from",
  "that",
  "this",
  "are",
  "was",
  "were",
  "have",
  "has",
  "had",
  "you",
  "your",
  "about",
  "into",
  "will",
  "would",
  "could",
  "their",
  "them",
  "they",
  "what",
  "when",
  "where",
  "which",
  "while",
  "than",
]);

function normalizeToken(input: string): string {
  return input.toLowerCase().replace(/[^a-z0-9-]/g, "");
}

export function deriveTopicsFromText(title: string, content: string): string[] {
  const src = `${title} ${content}`.toLowerCase();
  const words = src.split(/\s+/).map(normalizeToken).filter((x) => x.length >= 3 && !STOP_WORDS.has(x));
  const priority = ["security", "compliance", "governance", "policy", "api", "database", "supabase", "chat", "rss"];
  const out: string[] = [];
  for (const p of priority) {
    if (words.includes(p)) out.push(p);
  }
  for (const word of words) {
    if (out.length >= 8) break;
    if (!out.includes(word)) out.push(word);
  }
  return out.slice(0, 8);
}

export function slugifyTitle(input: string): string {
  const slug = input
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
  return slug || "item";
}
