import { test, expect } from '@playwright/test';

test.describe('Facilities', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/facilities');
  });

  test('shows page title', async ({ page }) => {
    await expect(page.locator('h1')).toContainText('Facility Registry');
  });

  test('shows GPI Locations section', async ({ page }) => {
    await expect(page.locator('text=GPI Locations')).toBeVisible();
  });

  test('shows Registered Facilities section', async ({ page }) => {
    await expect(page.locator('text=Registered Facilities')).toBeVisible();
  });

  test('shows legend items', async ({ page }) => {
    await expect(page.locator('text=Compliant')).toBeVisible();
    await expect(page.locator('text=Violation')).toBeVisible();
    await expect(page.locator('text=Pending')).toBeVisible();
  });

  test('facility link navigates to detail', async ({ page }) => {
    // If there's a facility link, click it
    const facilityLink = page.locator('a[href^="/facilities/GPI-"]').first();
    if (await facilityLink.isVisible()) {
      await facilityLink.click();
      await expect(page).toHaveURL(/\/facilities\/GPI-/);
      await expect(page.locator('text=Back to Facilities')).toBeVisible();
    }
  });

  test('facility detail shows tabs', async ({ page }) => {
    const facilityLink = page.locator('a[href^="/facilities/GPI-"]').first();
    if (await facilityLink.isVisible()) {
      await facilityLink.click();
      await expect(page.locator('text=Sensor Readings')).toBeVisible();
      await expect(page.locator('button:has-text("Compliance")')).toBeVisible();
      await expect(page.locator('text=Tokens')).toBeVisible();
    }
  });

  test('back link returns to facilities list', async ({ page }) => {
    const facilityLink = page.locator('a[href^="/facilities/GPI-"]').first();
    if (await facilityLink.isVisible()) {
      await facilityLink.click();
      await page.click('text=Back to Facilities');
      await expect(page).toHaveURL(/\/facilities$/);
    }
  });

  test('tab switching works in detail page', async ({ page }) => {
    const facilityLink = page.locator('a[href^="/facilities/GPI-"]').first();
    if (await facilityLink.isVisible()) {
      await facilityLink.click();
      await page.click('button:has-text("Compliance")');
      // Should show compliance content or empty state
      await page.click('button:has-text("Tokens")');
      await expect(page.locator('text=GGCC Credits Earned')).toBeVisible();
    }
  });
});
