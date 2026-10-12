import { test, expect, type Page } from '@playwright/test';

// Breakpoints required by the dev repo's AGENTS.md: 320, 768, 1024, 1280+.
const VIEWPORTS = [
  { name: 'phone 320', width: 320, height: 640 },
  { name: 'tablet 768', width: 768, height: 1024 },
  { name: 'tablet 1024', width: 1024, height: 768 },
  { name: 'desktop 1280', width: 1280, height: 800 },
];

async function hasHorizontalScroll(page: Page) {
  return page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
}

test.describe('no unintended horizontal scrolling', () => {
  for (const vp of VIEWPORTS) {
    test(`sign-in page at ${vp.name}`, async ({ browser }) => {
      const context = await browser.newContext({
        viewport: { width: vp.width, height: vp.height },
        storageState: { cookies: [], origins: [] },
      });
      const page = await context.newPage();
      await page.goto('/login');
      await expect(page.getByRole('button', { name: 'LOGIN' })).toBeVisible();
      expect(await hasHorizontalScroll(page)).toBe(false);
      await context.close();
    });

    test(`user directory at ${vp.name}`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto('/user-management');
      await expect(page.getByRole('heading', { name: 'User management', level: 1 })).toBeVisible();
      expect(await hasHorizontalScroll(page)).toBe(false);
    });
  }
});
