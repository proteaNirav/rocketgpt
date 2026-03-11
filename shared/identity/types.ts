export type MishtiActorType =
  | "owner"
  | "brain"
  | "builder"
  | "librarian"
  | "consortium"
  | "pm"
  | "engineer"
  | "learner"
  | "runtime"
  | "cats"
  | "os"
  | "police"
  | "documentor";

export type IdentityStatus = "pending" | "active" | "suspended" | "revoked";

export interface ActorIdentity {
  actorId: string;
  actorType: MishtiActorType;
  status: IdentityStatus;
  displayName?: string;
}

export interface ScopedIdentityRef {
  actorId: string;
  scope: string;
}
