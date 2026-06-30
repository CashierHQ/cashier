import type { LinkStep } from "$modules/links/types/linkStep";
import type { Link as SharedLink } from "$shared";

/**
 * Draft-only link model used by the create-link flow.
 *
 * `SharedLink.link_state` is the backend-compatible lifecycle state. It does
 * not represent every frontend wizard step, so draft restoration keeps the
 * exact UI step separately.
 */
export type DraftLink = SharedLink & {
  creationStep?: LinkStep;
};
