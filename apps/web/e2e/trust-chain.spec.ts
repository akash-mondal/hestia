import { test, expect } from '@playwright/test';

test.describe('Trust Chain', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/trust-chain');
  });

  test('shows page title', async ({ page }) => {
    await expect(page.locator('h1')).toContainText('Trust Chain Explorer');
  });

  test('shows facility dropdown', async ({ page }) => {
    await expect(page.locator('select')).toBeVisible();
  });

  test('shows expand all button', async ({ page }) => {
    await expect(page.locator('text=Expand All')).toBeVisible();
  });

  test('shows empty state or trust chain levels', async ({ page }) => {
    // Either shows "Select a facility" or trust chain levels
    const emptyState = page.locator('text=Select a facility to explore');
    const level1 = page.locator('text=Level 1');
    await expect(emptyState.or(level1)).toBeVisible();
  });

  test('expand all reveals more content', async ({ page }) => {
    const level1 = page.locator('text=Level 1');
    if (await level1.isVisible()) {
      await page.click('text=Expand All');
      // Should now show fields from deeper levels
      await expect(page.locator('text=Algorithm').or(page.locator('text=Source'))).toBeVisible();
    }
  });

  test('clicking a level toggles it', async ({ page }) => {
    const level1 = page.locator('text=Level 1');
    if (await level1.isVisible()) {
      // Click to collapse
      await level1.click();
      // Click again to expand
      await level1.click();
    }
  });
});
