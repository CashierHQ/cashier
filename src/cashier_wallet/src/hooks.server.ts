import type { Handle } from "@sveltejs/kit";

export const handle: Handle = async ({ event, resolve }) => {
  const response = await resolve(event);

  // /consent is a user-facing popup — block embedding entirely to prevent
  // clickjacking overlays on the Approve / Reject buttons.
  //
  // All other wallet pages serve as the hidden RPC iframe. Any DApp that
  // integrates via the SDK must be able to embed this iframe, so we use
  // frame-ancestors * here. There is no clickjacking risk because the iframe
  // has no visible UI — security is enforced by the user consent popup.
  const isConsentRoute = event.url.pathname.startsWith("/consent");
  const frameAncestors = isConsentRoute ? "'none'" : "*";

  response.headers.set(
    "Content-Security-Policy",
    `frame-ancestors ${frameAncestors}`,
  );

  return response;
};
