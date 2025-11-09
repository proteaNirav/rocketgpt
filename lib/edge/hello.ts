import type { NextRequest } from "next/server";

export default async function hello(_req: NextRequest) {
  return { hello: "world", ts: Date.now() };
}
