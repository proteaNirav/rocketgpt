import type { TesterProfileConfig, TesterProfileId } from "./profiles";

export interface TesterRunRequest {
  /**
   * Optional human goal or description of what we are testing.
   */
  goal?: string;

  /**
   * Optional run identifier (for logging / correlation).
   */
  run_id?: string;

  /**
   * Optional explicit list of test cases to include.
   * When omitted, profile decides which default set to run.
   */
  test_cases?: string[];

  /**
   * Desired tester profile id.
   * Examples: "base", "light", "full", "stress", "regression".
   *
   * If absent or invalid, we will fall back to the default profile.
   */
  profile?: TesterProfileId | string;

  /**
   * Arbitrary extra configuration to pass to the tester engine.
   */
  options?: Record<string, unknown>;
}

export interface TesterRunResolvedContext {
  /**
   * Parsed request payload.
   */
  request: TesterRunRequest;

  /**
   * Resolved tester profile config.
   */
  profile: TesterProfileConfig;
}
