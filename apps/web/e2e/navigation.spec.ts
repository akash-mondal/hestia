import { test, expect } from '@playwright/test';

test.describe('Navigation', () => {
  test('root redirects to /dashboard', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test('sidebar Overview link navigates to dashboard', async ({ page }) => {
    await page.goto('/dashboard');
    await page.click('text=Overview');
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test('sidebar Facilities link navigates', async ({ page }) => {
    await page.goto('/dashboard');
    await page.click('text=Facilities');
    await expect(page).toHaveURL(/\/facilities/);
  });

  test('sidebar Compliance link navigates', async ({ page }) => {
    await page.goto('/dashboard');
    await page.click('text=Compliance');
    await expect(page).toHaveURL(/\/compliance/);
  });

  test('sidebar Trust Chain link navigates', async ({ page }) => {
    await page.goto('/dashboard');
    await page.click('a:has-text("Trust Chain")');
    await expect(page).toHaveURL(/\/trust-chain/);
  });

  test('sidebar Satellite link navigates', async ({ page }) => {
    await page.goto('/dashboard');
    await page.click('text=Satellite');
    await expect(page).toHaveURL(/\/satellite/);
  });

  test('browser back/forward works', async ({ page }) => {
    await page.goto('/dashboard');
    await page.click('text=Facilities');
    await expect(page).toHaveURL(/\/facilities/);
    await page.goBack();
    await expect(page).toHaveURL(/\/dashboard/);
    await page.goForward();
    await expect(page).toHaveURL(/\/facilities/);
  });

  test('all pages load without console errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') errors.push(msg.text());
    });

    const pages = ['/dashboard', '/facilities', '/compliance', '/trust-chain', '/satellite'];
    for (const path of pages) {
      await page.goto(path);
      await page.waitForLoadState('networkidle');
    }

    // Filter out expected API errors (Guardian/satellite may not be running)
    const unexpected = errors.filter(e => !e.includes('fetch') && !e.includes('Failed to fetch'));
    expect(unexpected).toEqual([]);
  });
});
