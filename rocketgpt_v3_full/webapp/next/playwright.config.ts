import { defineConfig, devices } from '@playwright/test'

const playwrightPort = Number(process.env.PLAYWRIGHT_PORT || '3000')
const playwrightBaseUrl = process.env.PLAYWRIGHT_BASE_URL || `http://localhost:${playwrightPort}`

export default defineConfig({
  testDir: './tests',
  timeout: 30 * 1000,
  expect: {
    timeout: 5 * 1000,
  },
  fullyParallel: true,
  retries: 0,
  reporter: [
    ['list'],
    ['html', { outputFolder: process.env.PLAYWRIGHT_HTML_REPORT || 'playwright-report' }],
  ],
  use: {
    baseURL: playwrightBaseUrl,
    trace: 'on-first-retry',
  },
  webServer: {
    env: {
      RGPT_SAFE_MODE: '1',
      CATS_INMEMORY: '1',
      LEARNING_INMEMORY: '1',
      ADMIN_TOKEN: 'dev-admin-token',
      ALLOW_DEV_ADMIN_PROXY: 'true',
      NEXT_PUBLIC_DEV_TENANT_ID: '00000000-0000-4000-8000-000000000001',
      NEXT_PUBLIC_DEMO_USER_ID: '00000000-0000-4000-8000-000000000002',
      ...process.env,
    },
    command: `pnpm exec next dev -p ${playwrightPort}`,
    url: playwrightBaseUrl,
    reuseExistingServer: true,
    timeout: 120 * 1000,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
})
