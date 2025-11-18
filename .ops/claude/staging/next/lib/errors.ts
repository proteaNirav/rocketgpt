export type RateLimitPayload = {
  error: "rate_limited";
  minute_remaining: number;
  hour_remaining: number;
  retry_after_seconds: number;
  limits?: { plan_code: string; per_minute: number; per_hour: number };
};

export class RateLimitError extends Error {
  public rl: RateLimitPayload;
  public retryAfter?: number;
  constructor(message: string, rl: RateLimitPayload, retryAfter?: number) {
    super(message);
    this.name = "RateLimitError";
    this.rl = rl;
    this.retryAfter = retryAfter;
  }
}

export function isRateLimitError(e: unknown): e is RateLimitError {
  return e instanceof Error && (e as any).name === "RateLimitError";
}


