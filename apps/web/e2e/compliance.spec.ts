import { test, expect } from '@playwright/test';

test.describe('Compliance', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/compliance');
  });

  test('shows page title', async ({ page }) => {
    await expect(page.locator('h1')).toContainText('Compliance Matrix');
  });

  test('shows matrix table', async ({ page }) => {
    await expect(page.locator('text=CPCB Schedule-VI Compliance Matrix')).toBeVisible();
  });

  test('shows parameter headers', async ({ page }) => {
    await expect(page.locator('th:has-text("pH")')).toBeVisible();
    await expect(page.locator('th:has-text("BOD")')).toBeVisible();
    await expect(page.locator('th:has-text("COD")')).toBeVisible();
  });

  test('facility links navigate to detail', async ({ page }) => {
    const facilityLink = page.locator('a[href^="/facilities/GPI-"]').first();
    if (await facilityLink.isVisible()) {
      await facilityLink.click();
      await expect(page).toHaveURL(/\/facilities\/GPI-/);
    }
  });
});
