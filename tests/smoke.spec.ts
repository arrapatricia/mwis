import { test, expect } from '@playwright/test';

test.describe('@smoke public pages', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test('health endpoint reports the app is up', async ({ request }) => {
    const response = await request.get('/up');
    expect(response.status()).toBe(200);
  });

  test('root serves the sign-in page', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle('Sign in | Migrant Workers Insurance System');
    await expect(page.getByRole('heading', { name: 'Welcome Back!' })).toBeVisible();
    await expect(page.getByLabel('Email address')).toBeVisible();
    await expect(page.getByLabel('Password', { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'LOGIN' })).toBeVisible();
  });

  test('/login serves the same sign-in page', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByRole('heading', { name: 'Welcome Back!' })).toBeVisible();
  });

  test('anonymous users are redirected to sign in from user management', async ({ page }) => {
    await page.goto('/user-management');
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByRole('status').filter({ hasText: 'Please sign in to continue.' })).toBeVisible();
  });
});
