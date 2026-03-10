import { SessionBrain, type SessionBrainSnapshot } from "./session-brain";
import type { CognitiveStateValue } from "./types/cognitive-state.types";

export class SessionLifecycleManager {
  private readonly sessions = new Map<string, SessionBrain>();

  createSession(sessionId: string): SessionBrain {
    const existing = this.sessions.get(sessionId);
    if (existing && !existing.getCognitiveState().hasReachedTerminalState()) {
      return existing;
    }
    const brain = new SessionBrain(sessionId);
    this.sessions.set(sessionId, brain);
    return brain;
  }

  getSession(sessionId: string): SessionBrain | undefined {
    return this.sessions.get(sessionId);
  }

  getOrCreateSession(sessionId: string): SessionBrain {
    const existing = this.getSession(sessionId);
    if (!existing) {
      return this.createSession(sessionId);
    }
    if (existing.getCognitiveState().hasReachedTerminalState()) {
      return this.createSession(sessionId);
    }
    return existing;
  }

  hasSession(sessionId: string): boolean {
    return this.sessions.has(sessionId);
  }

  hasActiveSession(sessionId: string): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return false;
    }
    return !session.getCognitiveState().hasReachedTerminalState();
  }

  destroySession(sessionId: string): boolean {
    return this.sessions.delete(sessionId);
  }

  destroySessionIfTerminal(sessionId: string): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return false;
    }
    if (!session.getCognitiveState().hasReachedTerminalState()) {
      return false;
    }
    return this.sessions.delete(sessionId);
  }

  finalizeSession(
    sessionId: string,
    outcome: Extract<CognitiveStateValue, "completed" | "failed">,
    options: {
      reason?: string;
      source?: string;
      destroyOnFinalize?: boolean;
    } = {}
  ): SessionBrainSnapshot | undefined {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return undefined;
    }
    if (outcome === "completed") {
      session.getCognitiveState().markCompleted({
        reason: options.reason,
        source: options.source,
      });
    } else {
      session.getCognitiveState().markFailed({
        reason: options.reason,
        source: options.source,
      });
    }
    const snapshot = session.snapshot();
    if (options.destroyOnFinalize) {
      this.sessions.delete(sessionId);
    }
    return snapshot;
  }

  sessionCount(): number {
    return this.sessions.size;
  }

  snapshot(sessionId: string): SessionBrainSnapshot | undefined {
    return this.sessions.get(sessionId)?.snapshot();
  }

  snapshotAll(): SessionBrainSnapshot[] {
    return [...this.sessions.values()].map((brain) => brain.snapshot());
  }
}
