import type { NextRequest } from "next/server";

export default async function ping(_req: NextRequest) {
  return { pong: true, ts: Date.now() };
}
