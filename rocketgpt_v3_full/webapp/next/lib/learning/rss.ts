type RssEntry = {
  title: string;
  link: string | null;
  summary: string;
  publishedAt: string | null;
};

function stripTags(input: string): string {
  return input.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

function pickFirst(xml: string, tag: string): string | null {
  const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i");
  const match = xml.match(re);
  if (!match) return null;
  return stripTags(match[1]).trim() || null;
}

export function parseRssEntries(xml: string, maxItems = 20): RssEntry[] {
  const entries: RssEntry[] = [];
  const itemRe = /<item\b[\s\S]*?<\/item>/gi;
  const matches = xml.match(itemRe) ?? [];
  for (const raw of matches.slice(0, maxItems)) {
    const title = pickFirst(raw, "title") || "Untitled";
    const link = pickFirst(raw, "link");
    const description = pickFirst(raw, "description") || pickFirst(raw, "content:encoded") || "";
    const pubDate = pickFirst(raw, "pubDate") || pickFirst(raw, "updated");
    entries.push({
      title,
      link,
      summary: description,
      publishedAt: pubDate,
    });
  }
  return entries;
}
