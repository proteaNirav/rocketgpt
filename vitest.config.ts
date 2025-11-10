import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {\n    globals: true,
    include: ['tests/**/*.spec.ts'],
    environment: 'node',
    reporters: 'dot',
    passWithNoTests: false,
  },
});

