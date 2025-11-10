import { existsSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { join } from 'node:path';

function tryResolveImport(p: string) {
  const full = join(process.cwd(), p);
  if (!existsSync(full)) return { exists: false, imported: false };
  // Dynamic ESM import using file:// URL to catch runtime loader errors early
  return import(pathToFileURL(full).href)
    .then(() => ({ exists: true, imported: true }))
    .catch((e) => {
      // Surface useful info while keeping test failure clear
      throw new Error(Import failed for \: \);
    });
}

describe('Edge route contract – presence & importability', () => {
  const candidates = [
    // Primary dynamic route (Edge)
    'app/api/edge/[fn]/route.ts',
    'app/api/edge/[fn]/route.js',
    // Common helper endpoints used in this project
    'lib/edge/ping.ts',
    'lib/edge/ping.js',
    'lib/edge/echo.ts',
    'lib/edge/echo.js',
  ];

  it('at least one Edge API surface must exist', () => {
    const anyExists = candidates.some(p => existsSync(join(process.cwd(), p)));
    expect(anyExists).toBe(true);
  });

  it('existing Edge modules are importable (no runtime loader errors)', async () => {
    const existing = candidates.filter(p => existsSync(join(process.cwd(), p)));
    // If multiple exist, import all to catch individual breakage
    for (const p of existing) {
      const res = await tryResolveImport(p);
      expect(res.exists).toBe(true);
      expect(res.imported).toBe(true);
    }
  });
});
