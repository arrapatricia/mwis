import { test as setup, expect } from '@playwright/test';
import { ADMIN_STATE, admin } from './helpers/env';
import { signIn } from './helpers/users';

setup('sign in as System Admin', async ({ page }) => {
  await signIn(page, admin.email, admin.password);
  await expect(page).toHaveURL(/\/user-management$/);
  await expect(page.getByRole('heading', { name: 'User management', level: 1 })).toBeVisible();
  await page.context().storageState({ path: ADMIN_STATE });
});
