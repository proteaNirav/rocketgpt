export interface TesterRunInput {
  runId: string;
  buildId: string;
  testFiles: string[];
  mode: "orchestrator" | "manual";
  metadata?: Record<string, any>;
}

export interface TesterArtifact {
  type: string;
  path: string;
}

export interface TesterRunOutput {
  testRunId: string;
  summary: {
    status: "success" | "failed";
    tests_passed: number;
    tests_failed: number;
    duration_ms: number;
  };
  logs: string[];
  artifacts: TesterArtifact[];
}
