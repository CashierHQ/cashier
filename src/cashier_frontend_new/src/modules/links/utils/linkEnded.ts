import { LinkState as LegacyLinkState } from "$modules/links/types/link/linkState";
import type { LinkLike } from "$modules/routing/types";

/**
 * Determines whether a link has ended (no more claims possible), from its
 * state and use-count fields alone. Shared between the route redirect
 * resolver and the claim-flow store so "ended" is computed identically in
 * both places instead of maintaining two copies of the same predicate.
 * @param link The link to check
 * @returns true if the link has ended, false otherwise
 */
export function isLinkEnded(link: LinkLike | undefined): boolean {
  const useCount = link?.link_use_action_counter ?? link?.use_count;
  const maxUse = link?.link_use_action_max_count ?? link?.max_use;
  const isFullyUsed =
    useCount !== undefined &&
    maxUse !== undefined &&
    BigInt(maxUse) > 0n &&
    BigInt(useCount) >= BigInt(maxUse);

  return (
    link?.state === LegacyLinkState.INACTIVE ||
    link?.state === LegacyLinkState.INACTIVE_ENDED ||
    isFullyUsed
  );
}
