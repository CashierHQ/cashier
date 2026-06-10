import type { IpProtectionDecision, IpProtectionInput } from "./types";

/**
 * Resolves whether global IP protection should allow rendering, wait, or block.
 *
 * The UI component owns presentation only; this policy owns the route-level
 * decision so IP blocking follows the same structure as other redirect guards.
 *
 * @param input normalized IP protection state for the current visitor
 * @returns whether route rendering should continue, wait, or show blocked UI
 */
export function resolveIpProtection(
  input: IpProtectionInput,
): IpProtectionDecision {
  if (input.isLoading) {
    return { kind: "pending" };
  }

  if (input.countryCode && input.isBlacklisted) {
    return { kind: "block" };
  }

  return { kind: "allow" };
}
