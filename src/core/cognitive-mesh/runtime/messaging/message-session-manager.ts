import type { CognitiveParcel } from "./types/parcel";

interface SessionState {
  sessionId: string;
  parcelIds: string[];
  createdAt: string;
  updatedAt: string;
}

export class MessageSessionManager {
  private readonly sessions = new Map<string, SessionState>();

  trackParcel(parcel: CognitiveParcel): void {
    const now = new Date().toISOString();
    const existing = this.sessions.get(parcel.sessionId);
    if (existing) {
      existing.parcelIds.push(parcel.parcelId);
      existing.updatedAt = now;
      return;
    }
    this.sessions.set(parcel.sessionId, {
      sessionId: parcel.sessionId,
      parcelIds: [parcel.parcelId],
      createdAt: now,
      updatedAt: now,
    });
  }

  getSessionParcelIds(sessionId: string): string[] {
    return [...(this.sessions.get(sessionId)?.parcelIds ?? [])];
  }
}
