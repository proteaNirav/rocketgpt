import { CognitiveState } from "./cognitive-state";
import { DecisionTrail } from "./decision-trail";
import { ReasoningContext } from "./reasoning-context";
import { WorkingMemory } from "./working-memory";
import type { CognitiveStateValue } from "./types/cognitive-state.types";
import type { DecisionTrailEntry } from "./types/decision-trail.types";
import type { ReasoningContextEntry } from "./types/reasoning-context.types";
import type { WorkingMemorySnapshot } from "./types/working-memory.types";

export interface SessionBrainSnapshot {
  sessionId: string;
  cognitiveState: CognitiveStateValue;
  cognitiveTransitions: ReturnType<CognitiveState["getTransitions"]>;
  stateTransitionCount: number;
  workingMemory: WorkingMemorySnapshot;
  workingMemoryCount: number;
  reasoningContext: ReasoningContextEntry[];
  reasoningContextCount: number;
  decisionTrail: DecisionTrailEntry[];
  decisionCount: number;
  isTerminal: boolean;
  capturedAt: string;
}

export class SessionBrain {
  private readonly workingMemory: WorkingMemory;
  private readonly reasoningContext: ReasoningContext;
  private readonly decisionTrail: DecisionTrail;
  private readonly cognitiveState: CognitiveState;

  constructor(private readonly sessionId: string) {
    this.workingMemory = new WorkingMemory(sessionId);
    this.reasoningContext = new ReasoningContext(sessionId);
    this.decisionTrail = new DecisionTrail(sessionId);
    this.cognitiveState = new CognitiveState(sessionId);
  }

  getSessionId(): string {
    return this.sessionId;
  }

  getWorkingMemory(): WorkingMemory {
    return this.workingMemory;
  }

  getReasoningContext(): ReasoningContext {
    return this.reasoningContext;
  }

  getDecisionTrail(): DecisionTrail {
    return this.decisionTrail;
  }

  getCognitiveState(): CognitiveState {
    return this.cognitiveState;
  }

  snapshot(): SessionBrainSnapshot {
    const transitions = this.cognitiveState.getTransitions();
    const workingMemory = this.workingMemory.snapshot();
    const reasoningContext = this.reasoningContext.snapshot();
    const decisionTrail = this.decisionTrail.snapshot();

    return {
      sessionId: this.sessionId,
      cognitiveState: this.cognitiveState.getState(),
      cognitiveTransitions: transitions,
      stateTransitionCount: transitions.length,
      workingMemory,
      workingMemoryCount: Object.keys(workingMemory).length,
      reasoningContext,
      reasoningContextCount: reasoningContext.length,
      decisionTrail,
      decisionCount: decisionTrail.length,
      isTerminal: this.cognitiveState.hasReachedTerminalState(),
      capturedAt: new Date().toISOString(),
    };
  }
}
