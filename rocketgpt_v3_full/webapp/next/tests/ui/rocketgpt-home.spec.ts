import { test, expect } from '@playwright/test'

test.describe('RocketGPT Home UI', () => {
  test('loads the homepage and shows header', async ({ page }) => {
    await page.goto('/')

    // Title check – still expect RocketGPT, but log it if mismatch
    const title = await page.title()
    console.log('RocketGPT Home title:', title)
    await expect(title.toLowerCase()).toContain('rocketgpt')

    // Basic sanity check: header (banner) should be visible
    const header = page.getByRole('banner')
    await expect(header).toBeVisible()
  })
})
