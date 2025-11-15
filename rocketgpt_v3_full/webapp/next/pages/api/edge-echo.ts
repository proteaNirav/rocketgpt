import type { NextApiRequest, NextApiResponse } from "next";
export default function handler(req: NextApiRequest, res: NextApiResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method === "POST") {
    return res.status(200).json({ ok: true, route: "pages/edge-echo", body: req.body ?? null });
  }
  return res.status(200).json({ ok: true, route: "pages/edge-echo", hint: "POST a JSON body to echo" });
}
