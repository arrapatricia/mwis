import { expect, type Page } from '@playwright/test';
import { randomBytes } from 'node:crypto';

export type RoleName =
  | 'System Admin'
  | 'OFW Admin'
  | 'OFW Branch Issuer'
  | 'Recruitment Agency 1'
  | 'Recruitment Agency 2'
  | 'Accounts Executive'
  | 'Claims Processor'
  | 'Collection Assistant';

export interface NewUser {
  firstName: string;
  lastName: string;
  email: string;
  role: RoleName;
  status: 'Active' | 'Inactive';
  password: string;
}

/** Unique, clearly-fake test user. Passwords are generated per run, never hard-coded. */
export function buildUser(overrides: Partial<NewUser> = {}): NewUser {
  const id = randomBytes(4).toString('hex');
  return {
    firstName: 'E2E',
    lastName: `Tester${id}`,
    email: `e2e-${Date.now()}-${id}@example.com`,
    role: 'Claims Processor',
    status: 'Active',
    password: `Pw-${randomBytes(9).toString('hex')}`,
    ...overrides,
  };
}

export async function fillUserForm(page: Page, user: NewUser, passwordConfirmation = user.password) {
  await page.getByLabel('First name').fill(user.firstName);
  await page.getByLabel('Last name').fill(user.lastName);
  await page.getByLabel('Email address').fill(user.email);
  await page.getByLabel('Role', { exact: true }).selectOption({ label: user.role });
  await page.getByLabel('Status', { exact: true }).selectOption({ label: user.status });
  await page.getByLabel('Password', { exact: true }).fill(user.password);
  await page.getByLabel('Confirm password').fill(passwordConfirmation);
}

export async function createUser(page: Page, user: NewUser) {
  await page.goto('/user-management/new');
  await fillUserForm(page, user);
  await page.getByRole('button', { name: 'Create user' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'User created.' })).toBeVisible();
}

export async function searchUsers(page: Page, query: string) {
  await page.goto('/user-management');
  await page.getByLabel('Name or email').fill(query);
  await page.getByRole('button', { name: 'Search' }).click();
}

export function userRow(page: Page, email: string) {
  return page.locator('tr', { hasText: email });
}

export async function openEditPage(page: Page, user: Pick<NewUser, 'email' | 'firstName' | 'lastName'>) {
  await searchUsers(page, user.email);
  await userRow(page, user.email).getByRole('link', { name: `Edit ${user.firstName} ${user.lastName}` }).click();
  await expect(page.getByRole('heading', { name: 'Edit user' })).toBeVisible();
}

/** Deletes through the UI; silently returns when the user no longer exists. */
export async function deleteUser(page: Page, user: NewUser) {
  await searchUsers(page, user.email);
  if ((await userRow(page, user.email).count()) === 0) return;
  await openEditPage(page, user);
  page.once('dialog', (dialog) => dialog.accept());
  await page.getByRole('button', { name: 'Delete user' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'User deleted.' })).toBeVisible();
}

export async function signIn(page: Page, email: string, password: string, rememberMe = false) {
  await page.goto('/login');
  await page.getByLabel('Email address').fill(email);
  await page.getByLabel('Password', { exact: true }).fill(password);
  if (rememberMe) await page.getByLabel('Remember me').check();
  await page.getByRole('button', { name: 'LOGIN' }).click();
}
