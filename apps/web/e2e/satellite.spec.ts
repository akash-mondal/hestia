import { test, expect } from '@playwright/test';

test.describe('Satellite', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/satellite');
  });

  test('shows page title', async ({ page }) => {
    await expect(page.locator('h1')).toContainText('Satellite Validation');
  });

  test('shows fetch button', async ({ page }) => {
    await expect(page.locator('text=Fetch Satellite Data')).toBeVisible();
  });

  test('shows sentinel coverage section', async ({ page }) => {
    await expect(page.locator('text=Sentinel-2 Coverage')).toBeVisible();
  });

  test('shows cross-validation results section', async ({ page }) => {
    await expect(page.locator('text=Cross-Validation Results')).toBeVisible();
  });
});
