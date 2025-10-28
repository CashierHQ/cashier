# Anonymous actor option — guidance

This short note explains the `anonymous` actor option used by the links service
(`actorOptions?: { anonymous?: boolean }`) and when to use it.

## What it controls

- Type: `{ anonymous?: boolean }`
- Where used: passed to the internal `#getActor` method in
  `src/cashier_frontend_new/src/modules/links/services/cashierBackend.ts`.
- Effect: when `anonymous: true` the actor is constructed without an identity.
  That means requests are sent from an anonymous principal and no user identity
  is attached to the call.

## Typical use-cases

- Public reads: use anonymous actors for read-only operations that the canister
  exposes publicly. This avoids attaching the current user's identity for
  operations that don't require authentication.
- Preview or unauthenticated flows: when building UI that should work for
  unauthenticated visitors (for example, viewing a public link), request data
  anonymously so the server treats it as a public query.

## Important caveats and security notes

- Anonymous calls carry no user identity. They cannot perform actions that
  require authentication (e.g., creating links, disabling links, or any
  privileged call). Using `anonymous: true` for a call that expects an
  authenticated principal will typically fail or return an error from the
  canister.
- Canister-side authorization still applies — the canister decides what an
  anonymous principal can and cannot do.
- Some backend behavior may differ for anonymous principals (for example,
  rate-limiting, limited data returned, or different audit logs). Confirm the
  canister's API contract before relying on anonymous calls for feature parity.

## Implementation notes

- In `cashierBackendService.getLink` and `getLinkWithoutAction` the `actorOptions`
  object is forwarded to `#getActor`:

```ts
const actor = this.#getActor({ anonymous: actorOptions?.anonymous });
```

- When calling canister methods, the service sometimes converts optional
  objects with `toNullable(...)` before sending to the canister. For example,
  `get_link_details_v2(id, toNullable(options))` will send `null` when `options`
  is undefined.

## Examples

Fetch a public link anonymously (no identity attached):

```ts
const resp = await cashierBackendService.getLink("link-id-123", undefined, { anonymous: true });
```

Use anonymous actor to fetch link details without action:

```ts
const resp = await cashierBackendService.getLinkWithoutAction("link-id-123", { anonymous: true });
```

Attempting to call an authenticated-only endpoint with `anonymous: true` will
fail. For example, `createLinkV2` uses an authenticated actor and will return
an error if the underlying canister requires a principal.

## When not to use anonymous

- Any operation that modifies state (create/disable/process actions) or needs
  the caller's identity.

If you'd like, I can also:

- Add a short note in the module README linking to this file.
- Add a test or runtime check to assert anonymous actor calls are used only for
  known read-only methods.
