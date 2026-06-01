# Redirect Scenario Tests

Tracking tables for redirect scenarios from the sheets and manual review. Each row should stay brief: scenario ID, expected behavior, and current status.

Run a whole scenario by grepping its ID prefix:

```bash
npm run test:unit -- --run -t "LO-"
npm run test:e2e -- -g "LO-"
```

Run one row by its ID:

```bash
npm run test:unit -- --run -t "LO-03"
npm run test:e2e -- -g "LO-03"
```

## Redirect Terms

| Term             | URL / State                                 | Meaning                                                       |
| ---------------- | ------------------------------------------- | ------------------------------------------------------------- |
| Landing          | `/`                                         | Public home page                                              |
| Link list        | `/links`                                    | Owner's list of links                                         |
| Choose type      | `ChooseType`                                | Owner selects link type                                       |
| Add asset        | `AddAsset`                                  | Owner adds asset details                                      |
| Lock             | `Lock`                                      | Owner configures gate/lock                                    |
| Preview          | `Preview`                                   | Owner reviews link before creation                            |
| Created          | `Created`                                   | Owner sees creation success screen; detail is also accessible |
| Link detail      | `Created` / `Active` / `Inactive` / `Ended` | Owner views created link                                      |
| User landing     | `/link/[id]`                                | Public recipient landing                                      |
| User use         | `/link/[id]/use`                            | Recipient claim/use route                                     |
| Address unlocked | `AddressUnlocked`                           | Recipient can continue with wallet/address                    |
| Address locked   | `AddressLocked`                             | Recipient must unlock/connect address                         |
| Gate             | `Gate`                                      | Recipient must pass configured gate                           |
| Completed        | `Completed`                                 | Recipient finished use flow                                   |
| Link ended       | `Ended` before complete                     | Recipient sees ended screen                                   |
| Not found        | `/404`                                      | Invalid public link id                                        |

## Logged Out

Tests:

- Unit: `src/modules/routing/resolveRedirect.spec.ts`
- E2E: `tests/redirects.e2e.ts`

| ID    | Scenario    | Expected        | Status |
| ----- | ----------- | --------------- | ------ |
| LO-01 | Landing     | Stay on `/`     | Pass   |
| LO-02 | Link list   | Redirect to `/` | Pass   |
| LO-03 | Choose type | Redirect to `/` | Pass   |
| LO-04 | Add asset   | Redirect to `/` | Pass   |
| LO-05 | Lock        | Redirect to `/` | Pass   |
| LO-06 | Preview     | Redirect to `/` | Pass   |
| LO-07 | Link detail | Redirect to `/` | Pass   |

## User Logged Out

Tests:

- Unit: `src/modules/routing/resolveRedirect.spec.ts`
- E2E: `tests/redirects.e2e.ts`

Note: old UI protects `/link/[id]/use` with auth and redirects logged-out users to `/link/[id]`.

| ID    | Scenario         | Expected                 | Status |
| ----- | ---------------- | ------------------------ | ------ |
| UL-01 | User landing     | No redirect              | Pass   |
| UL-02 | Address unlocked | Redirect to user landing | Pass   |
| UL-03 | Address locked   | Redirect to user landing | Pass   |
| UL-04 | Gate             | Redirect to user landing | Pass   |
| UL-05 | Completed        | Redirect to user landing | Pass   |

## Invalid Public Link

Tests:

- Unit: `src/modules/routing/resolveRedirect.spec.ts`
- E2E: `tests/redirects.e2e.ts`

Note: owner-flow invalid links redirect to `/links`; public user-flow invalid links redirect to `/404`.

| ID    | Scenario                          | Expected           | Status |
| ----- | --------------------------------- | ------------------ | ------ |
| IP-01 | User landing with invalid link id | Redirect to `/404` | Pass   |
| IP-02 | User use with invalid link id     | Redirect to `/404` | Pass   |

## User Link Ended Before Completion

Tests:

- Unit: `src/modules/routing/resolveRedirect.spec.ts`
- E2E: `tests/redirects.e2e.ts`

| ID    | Scenario         | Expected        | Status |
| ----- | ---------------- | --------------- | ------ |
| UE-01 | User landing     | Show link ended | Pass   |
| UE-02 | Address unlocked | Show link ended | Pass   |
| UE-03 | Address locked   | Show link ended | Pass   |
| UE-04 | Gate             | Show link ended | Pass   |
| UE-05 | Completed        | Show link ended | Pass   |

## User Inactive Link

Tests:

- Unit: `src/modules/routing/resolveRedirect.spec.ts`
- E2E: `tests/redirects.e2e.ts`
- UI: `src/modules/home/components/Header.svelte.spec.ts`

| ID    | Scenario           | Expected                         | Status |
| ----- | ------------------ | -------------------------------- | ------ |
| UI-01 | Logged-out landing | Show link ended                  | Pass   |
| UI-02 | Logged-in landing  | Show link ended                  | Pass   |
| UI-03 | Logged-in use      | Show link ended                  | Pass   |
| UI-04 | Header logged in   | Hide public-page login CTA       | Pass   |
| UI-05 | Header logged out  | Show public-page login CTA       | Pass   |

## User No State

Tests:

- Unit: `src/modules/routing/resolveRedirect.spec.ts`
- E2E: `tests/redirects.e2e.ts`

| ID    | Scenario         | Expected                 | Status |
| ----- | ---------------- | ------------------------ | ------ |
| UN-01 | User landing     | No redirect              | Pass   |
| UN-02 | Address unlocked | Redirect to user landing | Pass   |
| UN-03 | Address locked   | Redirect to user landing | Pass   |
| UN-04 | Gate             | Redirect to user landing | Pass   |
| UN-05 | Completed        | Redirect to user landing | Pass   |

## User Landing State

Tests:

- Unit: `src/modules/routing/resolveRedirect.spec.ts`
- E2E: `tests/redirects.e2e.ts`

| ID     | Scenario         | Expected                 | Status |
| ------ | ---------------- | ------------------------ | ------ |
| ULS-01 | User landing     | No redirect              | Pass   |
| ULS-02 | Address unlocked | Redirect to user landing | Pass   |
| ULS-03 | Address locked   | Redirect to user landing | Pass   |
| ULS-04 | Gate             | Redirect to user landing | Pass   |
| ULS-05 | Completed        | Redirect to user landing | Pass   |

## User Address Unlocked State

Tests:

- Unit: `src/modules/routing/resolveRedirect.spec.ts`
- E2E: `tests/redirects.e2e.ts`

| ID    | Scenario         | Expected                     | Status |
| ----- | ---------------- | ---------------------------- | ------ |
| UA-01 | User landing     | Redirect to address unlocked | Pass   |
| UA-02 | Address unlocked | No redirect                  | Pass   |
| UA-03 | Address locked   | Show address unlocked        | Pass   |
| UA-04 | Gate             | Show address unlocked        | Pass   |
| UA-05 | Completed        | Show address unlocked        | Pass   |

## User Address Locked State

Tests:

- Unit: `src/modules/routing/resolveRedirect.spec.ts`
- E2E: `tests/redirects.e2e.ts`

| ID     | Scenario         | Expected                   | Status |
| ------ | ---------------- | -------------------------- | ------ |
| ULK-01 | User landing     | Redirect to address locked | Pass   |
| ULK-02 | Address unlocked | Show address locked        | Pass   |
| ULK-03 | Address locked   | No redirect                | Pass   |
| ULK-04 | Gate             | Show address locked        | Pass   |
| ULK-05 | Completed        | Show address locked        | Pass   |

## User Gate State

Tests:

- Unit: `src/modules/routing/resolveRedirect.spec.ts`
- E2E: `tests/redirects.e2e.ts`

| ID    | Scenario         | Expected         | Status |
| ----- | ---------------- | ---------------- | ------ |
| UG-01 | User landing     | Redirect to gate | Pass   |
| UG-02 | Address unlocked | Show gate        | Pass   |
| UG-03 | Address locked   | Show gate        | Pass   |
| UG-04 | Gate             | No redirect      | Pass   |
| UG-05 | Completed        | Show gate        | Pass   |

## User Completed State

Tests:

- Unit: `src/modules/routing/resolveRedirect.spec.ts`
- E2E: `tests/redirects.e2e.ts`

| ID    | Scenario         | Expected              | Status |
| ----- | ---------------- | --------------------- | ------ |
| UC-01 | User landing     | Redirect to completed | Pass   |
| UC-02 | Address unlocked | Show completed        | Pass   |
| UC-03 | Address locked   | Show completed        | Pass   |
| UC-04 | Gate             | Show completed        | Pass   |
| UC-05 | Completed        | No redirect           | Pass   |

## No Link State

Tests:

- Unit: `src/modules/routing/resolveRedirect.spec.ts`
- E2E: `tests/redirects.e2e.ts`

Note: create-flow pages share `/link/create/[id]`; separate rows mirror the sheet.

| ID    | Scenario    | Expected             | Status |
| ----- | ----------- | -------------------- | ------ |
| NS-01 | Landing     | Not possible         | N/A    |
| NS-02 | Link list   | Not possible         | N/A    |
| NS-03 | Choose type | Redirect to `/links` | Pass   |
| NS-04 | Add asset   | Redirect to `/links` | Pass   |
| NS-05 | Lock        | Redirect to `/links` | Pass   |
| NS-06 | Preview     | Redirect to `/links` | Pass   |
| NS-07 | Link detail | Redirect to `/links` | Pass   |

## Choose Type State

Tests:

- Unit: `src/modules/routing/resolveRedirect.spec.ts`
- E2E: `tests/redirects.e2e.ts`

Note: create-flow pages share `/link/create/[id]`; separate rows mirror the sheet.

| ID    | User       | Scenario    | Expected                | Status |
| ----- | ---------- | ----------- | ----------------------- | ------ |
| CT-01 | Owner      | Landing     | Not possible            | N/A    |
| CT-02 | Owner      | Link list   | Not possible            | N/A    |
| CT-03 | Owner      | Choose type | No redirect             | Pass   |
| CT-04 | Owner      | Add asset   | Show choose type        | Pass   |
| CT-05 | Owner      | Lock        | Show choose type        | Pass   |
| CT-06 | Owner      | Preview     | Show choose type        | Pass   |
| CT-07 | Owner      | Link detail | Redirect to choose type | Pass   |
| CT-08 | Other user | Choose type | Redirect to `/links`    | Pass   |
| CT-09 | Other user | Add asset   | Redirect to `/links`    | Pass   |
| CT-10 | Other user | Lock        | Redirect to `/links`    | Pass   |
| CT-11 | Other user | Preview     | Redirect to `/links`    | Pass   |
| CT-12 | Other user | Link detail | Redirect to `/links`    | Pass   |

## Add Asset State

Tests:

- Unit: `src/modules/routing/resolveRedirect.spec.ts`
- E2E: `tests/redirects.e2e.ts`

Note: create-flow pages share `/link/create/[id]`; separate rows mirror the sheet.

| ID    | User       | Scenario    | Expected              | Status |
| ----- | ---------- | ----------- | --------------------- | ------ |
| AA-01 | Owner      | Landing     | Not possible          | N/A    |
| AA-02 | Owner      | Link list   | Not possible          | N/A    |
| AA-03 | Owner      | Choose type | Show add asset        | Pass   |
| AA-04 | Owner      | Add asset   | No redirect           | Pass   |
| AA-05 | Owner      | Lock        | Show add asset        | Pass   |
| AA-06 | Owner      | Preview     | Show add asset        | Pass   |
| AA-07 | Owner      | Link detail | Redirect to add asset | Pass   |
| AA-08 | Other user | Choose type | Redirect to `/links`  | Pass   |
| AA-09 | Other user | Add asset   | Redirect to `/links`  | Pass   |
| AA-10 | Other user | Lock        | Redirect to `/links`  | Pass   |
| AA-11 | Other user | Preview     | Redirect to `/links`  | Pass   |
| AA-12 | Other user | Link detail | Redirect to `/links`  | Pass   |

## Lock State

Tests:

- Unit: `src/modules/routing/resolveRedirect.spec.ts`
- E2E: `tests/redirects.e2e.ts`

Note: create-flow pages share `/link/create/[id]`; separate rows mirror the sheet.

| ID    | User       | Scenario    | Expected             | Status |
| ----- | ---------- | ----------- | -------------------- | ------ |
| LK-01 | Owner      | Landing     | Not possible         | N/A    |
| LK-02 | Owner      | Link list   | Not possible         | N/A    |
| LK-03 | Owner      | Choose type | Show lock            | Pass   |
| LK-04 | Owner      | Add asset   | Show lock            | Pass   |
| LK-05 | Owner      | Lock        | No redirect          | Pass   |
| LK-06 | Owner      | Preview     | Show lock            | Pass   |
| LK-07 | Owner      | Link detail | Redirect to lock     | Pass   |
| LK-08 | Other user | Choose type | Redirect to `/links` | Pass   |
| LK-09 | Other user | Add asset   | Redirect to `/links` | Pass   |
| LK-10 | Other user | Lock        | Redirect to `/links` | Pass   |
| LK-11 | Other user | Preview     | Redirect to `/links` | Pass   |
| LK-12 | Other user | Link detail | Redirect to `/links` | Pass   |

## Preview State

Tests:

- Unit: `src/modules/routing/resolveRedirect.spec.ts`
- E2E: `tests/redirects.e2e.ts`

Note: create-flow pages share `/link/create/[id]`; separate rows mirror the sheet.

| ID    | User       | Scenario    | Expected             | Status |
| ----- | ---------- | ----------- | -------------------- | ------ |
| PV-01 | Owner      | Landing     | Not possible         | N/A    |
| PV-02 | Owner      | Link list   | Not possible         | N/A    |
| PV-03 | Owner      | Choose type | Show preview         | Pass   |
| PV-04 | Owner      | Add asset   | Show preview         | Pass   |
| PV-05 | Owner      | Lock        | Show preview         | Pass   |
| PV-06 | Owner      | Preview     | No redirect          | Pass   |
| PV-07 | Owner      | Link detail | Redirect to preview  | Pass   |
| PV-08 | Other user | Choose type | Redirect to `/links` | Pass   |
| PV-09 | Other user | Add asset   | Redirect to `/links` | Pass   |
| PV-10 | Other user | Lock        | Redirect to `/links` | Pass   |
| PV-11 | Other user | Preview     | Redirect to `/links` | Pass   |
| PV-12 | Other user | Link detail | Redirect to `/links` | Pass   |

## Created State

Tests:

- Unit: `src/modules/routing/resolveRedirect.spec.ts`
- E2E: `tests/redirects.e2e.ts`

Note: old UI allows `Created` on both create and detail routes.

| ID    | User       | Scenario    | Expected             | Status |
| ----- | ---------- | ----------- | -------------------- | ------ |
| CR-01 | Owner      | Landing     | Not possible         | N/A    |
| CR-02 | Owner      | Link list   | Not possible         | N/A    |
| CR-03 | Owner      | Choose type | Show created         | Pass   |
| CR-04 | Owner      | Add asset   | Show created         | Pass   |
| CR-05 | Owner      | Lock        | Show created         | Pass   |
| CR-06 | Owner      | Preview     | Show created         | Pass   |
| CR-07 | Owner      | Link detail | No redirect          | Pass   |
| CR-08 | Other user | Choose type | Redirect to `/links` | Pass   |
| CR-09 | Other user | Add asset   | Redirect to `/links` | Pass   |
| CR-10 | Other user | Lock        | Redirect to `/links` | Pass   |
| CR-11 | Other user | Preview     | Redirect to `/links` | Pass   |
| CR-12 | Other user | Link detail | Redirect to `/links` | Pass   |

## Active State

Tests:

- Unit: `src/modules/routing/resolveRedirect.spec.ts`
- E2E: `tests/redirects.e2e.ts`

Note: create-flow pages share `/link/create/[id]`; separate rows mirror the sheet.

| ID    | User       | Scenario    | Expected             | Status |
| ----- | ---------- | ----------- | -------------------- | ------ |
| AC-01 | Owner      | Landing     | Not possible         | N/A    |
| AC-02 | Owner      | Link list   | Not possible         | N/A    |
| AC-03 | Owner      | Choose type | Redirect to detail   | Pass   |
| AC-04 | Owner      | Add asset   | Redirect to detail   | Pass   |
| AC-05 | Owner      | Lock        | Redirect to detail   | Pass   |
| AC-06 | Owner      | Preview     | Redirect to detail   | Pass   |
| AC-07 | Owner      | Link detail | No redirect          | Pass   |
| AC-08 | Other user | Choose type | Redirect to `/links` | Pass   |
| AC-09 | Other user | Add asset   | Redirect to `/links` | Pass   |
| AC-10 | Other user | Lock        | Redirect to `/links` | Pass   |
| AC-11 | Other user | Preview     | Redirect to `/links` | Pass   |
| AC-12 | Other user | Link detail | Redirect to `/links` | Pass   |

## Inactive State

Tests:

- Unit: `src/modules/routing/resolveRedirect.spec.ts`
- E2E: `tests/redirects.e2e.ts`

Note: create-flow pages share `/link/create/[id]`; separate rows mirror the sheet.

| ID    | User       | Scenario    | Expected             | Status |
| ----- | ---------- | ----------- | -------------------- | ------ |
| IN-01 | Owner      | Landing     | Not possible         | N/A    |
| IN-02 | Owner      | Link list   | Not possible         | N/A    |
| IN-03 | Owner      | Choose type | Redirect to detail   | Pass   |
| IN-04 | Owner      | Add asset   | Redirect to detail   | Pass   |
| IN-05 | Owner      | Lock        | Redirect to detail   | Pass   |
| IN-06 | Owner      | Preview     | Redirect to detail   | Pass   |
| IN-07 | Owner      | Link detail | No redirect          | Pass   |
| IN-08 | Other user | Choose type | Redirect to `/links` | Pass   |
| IN-09 | Other user | Add asset   | Redirect to `/links` | Pass   |
| IN-10 | Other user | Lock        | Redirect to `/links` | Pass   |
| IN-11 | Other user | Preview     | Redirect to `/links` | Pass   |
| IN-12 | Other user | Link detail | Redirect to `/links` | Pass   |

## Inactive Ended State

Tests:

- Unit: `src/modules/routing/resolveRedirect.spec.ts`
- E2E: `tests/redirects.e2e.ts`

Note: this maps to local `Ended`; create-flow pages share `/link/create/[id]`.

| ID    | User       | Scenario    | Expected             | Status |
| ----- | ---------- | ----------- | -------------------- | ------ |
| IE-01 | Owner      | Landing     | Not possible         | N/A    |
| IE-02 | Owner      | Link list   | Not possible         | N/A    |
| IE-03 | Owner      | Choose type | Redirect to detail   | Pass   |
| IE-04 | Owner      | Add asset   | Redirect to detail   | Pass   |
| IE-05 | Owner      | Lock        | Redirect to detail   | Pass   |
| IE-06 | Owner      | Preview     | Redirect to detail   | Pass   |
| IE-07 | Owner      | Link detail | No redirect          | Pass   |
| IE-08 | Other user | Choose type | Redirect to `/links` | Pass   |
| IE-09 | Other user | Add asset   | Redirect to `/links` | Pass   |
| IE-10 | Other user | Lock        | Redirect to `/links` | Pass   |
| IE-11 | Other user | Preview     | Redirect to `/links` | Pass   |
| IE-12 | Other user | Link detail | Redirect to `/links` | Pass   |
