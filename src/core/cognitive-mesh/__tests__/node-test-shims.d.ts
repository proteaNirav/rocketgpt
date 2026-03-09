declare module "node:test" {
  export function test(name: string, fn: () => void | Promise<void>): void;
}

declare module "node:assert/strict" {
  const assert: any;
  export = assert;
}

declare module "node:perf_hooks" {
  export const performance: { now(): number };
}

declare module "node:fs/promises" {
  export function appendFile(path: string, data: string, encoding: string): Promise<void>;
  export function mkdir(path: string, options?: { recursive?: boolean }): Promise<void>;
}

declare module "node:path" {
  export function dirname(path: string): string;
}

declare const process: {
  env: Record<string, string | undefined>;
  cpuUsage(previousValue?: NodeJS.CpuUsage): NodeJS.CpuUsage;
  memoryUsage(): NodeJS.MemoryUsage;
};
