import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('Edge route contract – presence & export markers (loader-agnostic)', () => {
  const root = process.cwd();
  const candidates = [
    'app/api/edge/[fn]/route.ts',
    'app/api/edge/[fn]/route.js',
    'lib/edge/ping.ts',
    'lib/edge/ping.js',
    'lib/edge/echo.ts',
    'lib/edge/echo.js',
  ];
  const abs = (p: string) => join(root, p);

  it('at least one Edge API surface must exist', () => {
    const anyExists = candidates.some((p) => existsSync(abs(p)));
    expect(anyExists).toBe(true);
  });

  it('existing Edge modules should contain exports (static scan)', () => {
    const existing = candidates.filter((p) => existsSync(abs(p)));
    for (const p of existing) {
      const src = readFileSync(abs(p), 'utf8');
      // basic indicator of public API; avoids needing a TS/ESM loader in CI
      const hasExport = /\bexport\s+(const|function|async|default|class|interface|type)\b/.test(src);
      expect(hasExport).toBe(true);
    }
  });
});
