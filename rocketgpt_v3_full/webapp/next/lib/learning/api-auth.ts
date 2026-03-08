import { NextRequest } from "next/server";

import { isAdminWrite, isPrivilegedRead } from "@/lib/governance/auth";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type LearningActor = {
  tenantId: string;
  userId: string | null;
  isAdmin: boolean;
  canReview: boolean;
};

export function readLearningActor(req: NextRequest): LearningActor {
  const tenantId = (req.headers.get("x-tenant-id") || "").trim();
  if (!UUID_RE.test(tenantId)) {
    throw new Error("x-tenant-id header must be a UUID.");
  }
  const userRaw = (req.headers.get("x-user-id") || "").trim();
  return {
    tenantId,
    userId: UUID_RE.test(userRaw) ? userRaw : null,
    isAdmin: isAdminWrite(req),
    canReview: isPrivilegedRead(req),
  };
}
