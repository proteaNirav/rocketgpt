export type EngineRequest = {
  model: string;
  prompt: string;
};

export type EngineResponse = {
  text: string;
  provider: string;
  model: string;
  latencyMs: number;
  tokens?: number;
};
