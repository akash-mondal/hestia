import { test, expect } from '@playwright/test';

test.describe('Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard');
  });

  test('shows page title', async ({ page }) => {
    await expect(page.locator('h1')).toContainText('System Overview');
  });

  test('shows stat cards', async ({ page }) => {
    await expect(page.locator('text=Registered Facilities')).toBeVisible();
    await expect(page.locator('text=Sensor Readings')).toBeVisible();
    await expect(page.locator('text=Compliance Rate')).toBeVisible();
    await expect(page.locator('text=GGCC Credits Minted')).toBeVisible();
  });

  test('shows compliance trend section', async ({ page }) => {
    await expect(page.locator('text=Compliance Rate Trend')).toBeVisible();
  });

  test('shows recent activity section', async ({ page }) => {
    await expect(page.locator('text=Recent Activity')).toBeVisible();
  });

  test('shows Zeno branding in sidebar', async ({ page }) => {
    await expect(page.locator('text=ZENO')).toBeVisible();
    await expect(page.locator('text=dMRV Platform')).toBeVisible();
  });

  test('shows Testnet badge', async ({ page }) => {
    await expect(page.locator('text=Testnet')).toBeVisible();
  });
});
