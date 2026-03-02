import { NextRequest } from "next/server";

export type GovernanceRole = "admin" | "auditor" | "operator";

export function getGovernanceRole(req: NextRequest): GovernanceRole {
  const role = (req.headers.get("x-governance-role") || "").trim().toLowerCase();
  if (role === "admin") return "admin";
  if (role === "auditor") return "auditor";
  return "operator";
}

export function isPrivilegedRead(req: NextRequest): boolean {
  const role = getGovernanceRole(req);
  if (role === "admin" || role === "auditor") return true;
  return false;
}

export function isAdminWrite(req: NextRequest): boolean {
  const role = getGovernanceRole(req);
  if (role !== "admin") return false;
  const token = req.headers.get("x-admin-token");
  return !!token && !!process.env.ADMIN_TOKEN && token === process.env.ADMIN_TOKEN;
}

