import { test as base, expect } from '@playwright/test';
import { buildUser, createUser, deleteUser, type NewUser } from './helpers/users';

type Fixtures = {
  /** Creates a throwaway user through the admin UI and deletes it after the test. */
  newUser: (overrides?: Partial<NewUser>) => Promise<NewUser>;
};

export const test = base.extend<Fixtures>({
  newUser: async ({ page }, use) => {
    const created: NewUser[] = [];
    await use(async (overrides = {}) => {
      const user = buildUser(overrides);
      await createUser(page, user);
      created.push(user);
      return user;
    });
    for (const user of created) {
      await deleteUser(page, user).catch(() => {});
    }
  },
});

export { expect };
