import { test, expect } from './fixtures';
import { admin } from './helpers/env';
import {
  buildUser,
  fillUserForm,
  openEditPage,
  searchUsers,
  signIn,
  userRow,
} from './helpers/users';

test.describe('user management (System Admin)', () => {
  test('@smoke directory shows summary, search and role guide', async ({ page }) => {
    await page.goto('/user-management');
    await expect(page.getByRole('heading', { name: 'User management', level: 1 })).toBeVisible();
    await expect(page.getByLabel('User totals')).toContainText('Total users');
    await expect(page.getByRole('heading', { name: 'User directory' })).toBeVisible();
    await expect(page.getByRole('link', { name: /Add user/ })).toBeVisible();

    await page.getByText('About user roles').click();
    await expect(page.getByText('8 roles')).toBeVisible();
  });

  test('create user: appears in the directory with role and status', async ({ page, newUser }) => {
    const user = await newUser({ role: 'Claims Processor' });
    await searchUsers(page, user.email);
    const row = userRow(page, user.email);
    await expect(row).toContainText(`${user.firstName} ${user.lastName}`);
    await expect(row).toContainText('Claims Processor');
    await expect(row).toContainText('Active');
  });

  test('search by email narrows the list; unknown search shows empty state', async ({ page, newUser }) => {
    const user = await newUser();
    await searchUsers(page, user.email);
    await expect(page.locator('tbody tr')).toHaveCount(1);
    await expect(page.getByText('Showing 1 of')).toBeVisible();

    await searchUsers(page, `nobody-${Date.now()}@example.invalid`);
    await expect(page.getByRole('status').filter({ hasText: 'No users found' })).toBeVisible();
  });

  test('role and status filters combine with search', async ({ page, newUser }) => {
    const user = await newUser({ role: 'Accounts Executive', status: 'Inactive' });

    await page.goto('/user-management');
    await page.getByLabel('Name or email').fill(user.email);
    await page.getByLabel('Role', { exact: true }).selectOption({ label: 'Accounts Executive' });
    await page.getByLabel('Status', { exact: true }).selectOption({ label: 'Inactive' });
    await page.getByRole('button', { name: 'Search' }).click();
    await expect(userRow(page, user.email)).toBeVisible();

    await page.getByLabel('Status', { exact: true }).selectOption({ label: 'Active' });
    await page.getByRole('button', { name: 'Search' }).click();
    await expect(userRow(page, user.email)).toHaveCount(0);
  });

  test('server rejects a mismatched password confirmation', async ({ page }) => {
    const user = buildUser();
    await page.goto('/user-management/new');
    await fillUserForm(page, user, `${user.password}-different`);
    await page.getByRole('button', { name: 'Create user' }).click();
    await expect(page.getByRole('alert').filter({ hasText: 'Check the following fields' })).toContainText(
      /confirmation/i,
    );
    await searchUsers(page, user.email);
    await expect(userRow(page, user.email)).toHaveCount(0);
  });

  test('server rejects a duplicate email (case-insensitive)', async ({ page, newUser }) => {
    const existing = await newUser();
    const duplicate = buildUser({ email: existing.email.toUpperCase() });
    await page.goto('/user-management/new');
    await fillUserForm(page, duplicate);
    await page.getByRole('button', { name: 'Create user' }).click();
    await expect(page.getByRole('alert').filter({ hasText: 'Check the following fields' })).toContainText(
      /email.*taken/i,
    );
  });

  test('passwords shorter than 12 characters are blocked', async ({ page }) => {
    const user = buildUser({ password: 'short-pw-1' });
    await page.goto('/user-management/new');
    await fillUserForm(page, user);
    await page.getByRole('button', { name: 'Create user' }).click();
    // Browser minlength validation keeps the user on the form.
    await expect(page).toHaveURL(/\/user-management\/new$/);
    await searchUsers(page, user.email);
    await expect(userRow(page, user.email)).toHaveCount(0);
  });

  test('edit user: changes are saved and shown in the directory', async ({ page, newUser }) => {
    const user = await newUser();
    await openEditPage(page, user);
    const newLastName = `${user.lastName}Edited`;
    await page.getByLabel('Last name').fill(newLastName);
    await page.getByRole('button', { name: 'Save changes' }).click();
    await expect(page.getByRole('status').filter({ hasText: 'User updated.' })).toBeVisible();

    await searchUsers(page, user.email);
    await expect(userRow(page, user.email)).toContainText(newLastName);
  });

  test('an Inactive user cannot sign in', async ({ browser, newUser }) => {
    const user = await newUser({ status: 'Inactive' });
    const context = await browser.newContext({ storageState: { cookies: [], origins: [] } });
    const page = await context.newPage();
    await signIn(page, user.email, user.password);
    await expect(page).toHaveURL(/\/login$/);
    await expect(
      page.getByRole('status').filter({ hasText: 'Invalid email or password, or this account is inactive.' }),
    ).toBeVisible();
    await context.close();
  });

  test('a non-admin role can sign in but gets the access-restricted page', async ({ browser, newUser }) => {
    const user = await newUser({ role: 'Claims Processor', status: 'Active' });
    const context = await browser.newContext({ storageState: { cookies: [], origins: [] } });
    const page = await context.newPage();
    await signIn(page, user.email, user.password);
    await expect(page.getByRole('heading', { name: 'Administrator access required' })).toBeVisible();

    const response = await page.goto('/user-management');
    expect(response?.status()).toBe(403);
    await context.close();
  });

  test('the signed-in admin cannot delete their own account', async ({ page }) => {
    // The Edit link's accessible name includes the admin's real name, which we do not know.
    await searchUsers(page, admin.email);
    await userRow(page, admin.email).getByRole('link', { name: /^Edit / }).click();
    await expect(page.getByRole('heading', { name: 'Edit user' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Delete user' })).toHaveCount(0);
  });

  test('delete user removes the account', async ({ page, newUser }) => {
    const user = await newUser();
    await openEditPage(page, user);
    page.once('dialog', (dialog) => dialog.accept());
    await page.getByRole('button', { name: 'Delete user' }).click();
    await expect(page.getByRole('status').filter({ hasText: 'User deleted.' })).toBeVisible();

    await searchUsers(page, user.email);
    await expect(userRow(page, user.email)).toHaveCount(0);
  });
});
