import { NextRequest } from "next/server";

import { isAdminWrite } from "@/lib/governance/auth";

export type CatsActor = {
  tenantId: string;
  userId: string | null;
  isAdmin: boolean;
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function readActor(req: NextRequest): CatsActor {
  const tenantId = (req.headers.get("x-tenant-id") || "").trim();
  if (!UUID_RE.test(tenantId)) {
    throw new Error("x-tenant-id header must be a UUID.");
  }
  const userIdRaw = (req.headers.get("x-user-id") || "").trim();
  const userId = UUID_RE.test(userIdRaw) ? userIdRaw : null;
  const admin = isAdminWrite(req);
  return { tenantId, userId, isAdmin: admin };
}

export function canWriteAsOwnerOrAdmin(actor: CatsActor, ownerUserId: string | null): boolean {
  if (actor.isAdmin) return true;
  if (!actor.userId) return false;
  return ownerUserId === actor.userId;
}
