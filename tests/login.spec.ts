import { test, expect } from '@playwright/test';
import { admin } from './helpers/env';
import { signIn } from './helpers/users';

// Sign-ins are rate limited to 10 per IP per 3 minutes. This file spends 3
// attempts; keep the total across the whole suite comfortably below that.
test.describe('sign in', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test('@smoke System Admin can sign in and lands on user management', async ({ page }) => {
    await signIn(page, admin.email, admin.password);
    await expect(page).toHaveURL(/\/user-management$/);
    await expect(page.getByRole('heading', { name: 'User management', level: 1 })).toBeVisible();

    // Without "Remember me" the cookie is a browser-session cookie.
    const cookie = (await page.context().cookies()).find((c) => c.name === 'mwis_session_id');
    expect(cookie, 'session cookie is set').toBeDefined();
    expect(cookie!.httpOnly).toBe(true);
    expect(cookie!.sameSite).toBe('Lax');
    expect(cookie!.expires).toBe(-1);
  });

  test('wrong password is rejected with a generic message', async ({ page }) => {
    await signIn(page, admin.email, 'definitely-not-the-password');
    await expect(page).toHaveURL(/\/login$/);
    await expect(
      page.getByRole('status').filter({ hasText: 'Invalid email or password, or this account is inactive.' }),
    ).toBeVisible();
  });

  test('"Remember me" persists the session ~30 days, and sign out revokes it', async ({ page, context }) => {
    await signIn(page, admin.email, admin.password, true);
    await expect(page).toHaveURL(/\/user-management$/);

    const cookie = (await context.cookies()).find((c) => c.name === 'mwis_session_id');
    const days = (cookie!.expires - Date.now() / 1000) / 86_400;
    expect(days).toBeGreaterThan(29);
    expect(days).toBeLessThanOrEqual(30.1);

    await page.getByRole('button', { name: 'Sign out' }).click();
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByRole('status').filter({ hasText: 'You have been signed out.' })).toBeVisible();

    // The revoked session must no longer grant access.
    await page.goto('/user-management');
    await expect(page).toHaveURL(/\/login$/);
  });

  test('empty email is blocked by the browser before submitting', async ({ page }) => {
    await page.goto('/login');
    await page.getByRole('button', { name: 'LOGIN' }).click();
    await expect(page).toHaveURL(/\/login$/);
    const missing = await page.getByLabel('Email address').evaluate((el: HTMLInputElement) => el.validity.valueMissing);
    expect(missing).toBe(true);
  });

  test('Forgot Password shows an availability message (not implemented yet)', async ({ page }) => {
    await page.goto('/login');
    await page.getByRole('button', { name: 'Forgot Password?' }).click();
    await expect(page.getByRole('status').filter({ hasText: 'Password recovery is not available yet.' })).toBeVisible();
  });

  test('CUA LOGIN shows an availability message (not implemented yet)', async ({ page }) => {
    await page.goto('/login');
    await page.getByRole('button', { name: 'CUA LOGIN' }).click();
    await expect(page.getByRole('status').filter({ hasText: 'CUA sign-in is not available yet.' })).toBeVisible();
  });
});
