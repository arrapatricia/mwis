import { test, expect } from '@playwright/test';
import { admin } from './helpers/env';

test.describe('application navigation (desktop)', () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test('sidebar lists workspace, production and maintenance entries', async ({ page }) => {
    await page.goto('/user-management');
    const nav = page.getByRole('navigation', { name: 'Main navigation' });
    await expect(nav.getByRole('button', { name: 'Dashboard' })).toBeVisible();
    for (const label of [
      'OFW Direct Marketing',
      'OFW Seabase',
      'OFW Agency',
      'OFW Direct Hired',
      'OFW Balik Manggagawa',
    ]) {
      await expect(nav.getByRole('button', { name: label })).toBeVisible();
    }
    await expect(nav.getByRole('link', { name: 'Users' })).toHaveAttribute('aria-current', 'page');
  });

  test('unimplemented destinations show an availability message', async ({ page }) => {
    await page.goto('/user-management');
    const nav = page.getByRole('navigation', { name: 'Main navigation' });

    await nav.getByRole('button', { name: 'Dashboard' }).click();
    await expect(nav.getByRole('status')).toHaveText('Dashboard is not available yet.');

    await nav.getByRole('button', { name: 'OFW Seabase' }).click();
    await expect(nav.getByRole('status')).toHaveText('OFW Seabase is not available yet.');
  });

  test('menu button collapses and re-expands the sidebar', async ({ page }) => {
    await page.goto('/user-management');
    const toggle = page.getByRole('button', { name: 'Toggle navigation', exact: true });
    await expect(toggle).toHaveAttribute('aria-expanded', 'true');

    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');

    await page.getByRole('button', { name: 'Toggle navigation using logo' }).click();
    await expect(toggle).toHaveAttribute('aria-expanded', 'true');
  });

  test('footer shows the signed-in role and a sign-out action', async ({ page }) => {
    await page.goto('/user-management');
    await expect(page.locator('.app-profile')).toContainText('System Admin');
    await expect(page.getByRole('button', { name: 'Sign out' })).toBeVisible();
    // Admin e-mail is only used for sign-in, never rendered in the footer.
    await expect(page.locator('.app-profile')).not.toContainText(admin.email);
  });
});
