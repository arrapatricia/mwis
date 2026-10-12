# MWIS E2E tests

Playwright (TypeScript) end-to-end suite for the Migrant Workers Insurance System, whose source lives in the private dev repo `isd-sysdev/mwis`.

## Coverage

| Spec | What it checks |
| --- | --- |
| `smoke.spec.ts` | `/up` health, sign-in page, anonymous redirect |
| `login.spec.ts` | Valid and invalid sign-in, Remember me (30-day cookie), sign out revokes session, Forgot Password / CUA messages |
| `user-management.spec.ts` | Create, search, filter, edit, delete; validation; duplicate email; Inactive user blocked; non-admin gets 403; admin cannot delete self |
| `navigation.spec.ts` | Sidebar entries, "not available yet" messages, collapse toggle, footer |
| `responsive.spec.ts` | No horizontal scroll at 320 / 768 / 1024 / 1280 px |

Tests tagged `@smoke` can be run alone with `npm run test:smoke`.

## Run locally

1. Start MWIS from the dev repo (`bin/rails server -b 0.0.0.0 -p 3100`) and create a System Admin with `bin/rails mwis:create_admin`. Use a dedicated test account.
2. Set up this repo:

```bash
npm ci
npx playwright install chromium
cp .env.example .env   # fill MWIS_ADMIN_EMAIL and MWIS_ADMIN_PASSWORD
npm test
npm run report         # open the HTML report
```

The suite creates its own `e2e-*@example.com` users and deletes them afterwards. Run it only against dev/test environments, never production.

Sign-ins are rate limited to 10 per IP per 3 minutes. The suite uses about 6, so wait three minutes between consecutive full runs.

## CI/CD

`.github/workflows/e2e.yml` runs on every push to `main`, every pull request, weekdays at 06:00 PHT, on demand (Actions tab, Run workflow) and on `repository_dispatch` events of type `mwis-updated`.

Two modes:

- **Boot from source (default).** Checks out `isd-sysdev/mwis`, starts Postgres, runs `db:prepare`, creates a throwaway System Admin with a random password, boots the server and runs the suite.
- **Deployed environment.** Run the workflow manually with `base_url` set to test an existing deployment instead.

Artifacts: the HTML report, JUnit XML, and traces, screenshots and video for failures. The Rails log is uploaded when a boot-from-source run fails.

### Secrets to add (Settings, Secrets and variables, Actions)

| Secret | Needed for |
| --- | --- |
| `MWIS_REPO_TOKEN` | Boot-from-source mode. Fine-grained PAT with read-only **Contents** access to `isd-sysdev/mwis` |
| `MWIS_ADMIN_EMAIL`, `MWIS_ADMIN_PASSWORD` | `base_url` mode only. An active System Admin on that environment |

### Triggering from the dev repo

To gate dev-repo changes on this suite, add a step to the end of the dev repo's CI that fires the dispatch (it needs a token with permission to dispatch to this repo):

```yaml
- name: Trigger E2E suite
  run: |
    curl -sf -X POST \
      -H "Authorization: Bearer ${{ secrets.E2E_DISPATCH_TOKEN }}" \
      -H "Accept: application/vnd.github+json" \
      https://api.github.com/repos/arrapatricia/mwis/dispatches \
      -d '{"event_type":"mwis-updated","client_payload":{"ref":"${{ github.sha }}"}}'
```

## Known gaps

- Password recovery and CUA sign-in are not implemented in MWIS, so only their availability messages are tested.
- Agency-scoped permissions and the Dashboard / Production screens do not exist yet; add specs as they ship.
- The sign-in rate limit (10 per 3 minutes) is deliberately not tested, because it would lock out the rest of the run.
