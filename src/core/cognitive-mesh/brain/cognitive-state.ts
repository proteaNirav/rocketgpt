import type { CognitiveStateTransition, CognitiveStateValue } from "./types/cognitive-state.types";

export class CognitiveState {
  private state: CognitiveStateValue = "initializing";
  private readonly transitions: CognitiveStateTransition[] = [];

  constructor(private readonly sessionId: string) {}

  getState(): CognitiveStateValue {
    return this.state;
  }

  transitionTo(
    nextState: CognitiveStateValue,
    options: {
      reason?: string;
      source?: string;
    } = {}
  ): CognitiveStateTransition {
    const transition: CognitiveStateTransition = {
      from: this.state,
      to: nextState,
      timestamp: new Date().toISOString(),
      reason: options.reason,
      source: options.source,
    };
    this.state = nextState;
    this.transitions.push(transition);
    return transition;
  }

  transitionIfNotTerminal(
    nextState: CognitiveStateValue,
    options: {
      reason?: string;
      source?: string;
    } = {}
  ): CognitiveStateTransition | null {
    if (this.hasReachedTerminalState()) {
      return null;
    }
    return this.transitionTo(nextState, options);
  }

  markCompleted(options: { reason?: string; source?: string } = {}): CognitiveStateTransition | null {
    return this.transitionIfNotTerminal("completed", options);
  }

  markFailed(options: { reason?: string; source?: string } = {}): CognitiveStateTransition | null {
    return this.transitionIfNotTerminal("failed", options);
  }

  hasReachedTerminalState(): boolean {
    return CognitiveState.isTerminalState(this.state);
  }

  static isTerminalState(state: CognitiveStateValue): boolean {
    return state === "completed" || state === "failed";
  }

  getTransitions(): CognitiveStateTransition[] {
    return this.transitions.map((transition) => ({ ...transition }));
  }

  getSessionId(): string {
    return this.sessionId;
  }
}
