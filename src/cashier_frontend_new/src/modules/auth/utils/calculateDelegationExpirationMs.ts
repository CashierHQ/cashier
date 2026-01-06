import type { DelegationChain } from "@dfinity/identity";
import { NANOS_IN_MILLIS } from "../constants";

/**
 * Calculate the remaining delegation expiration time in milliseconds.
 * @param delegationChain The delegation chain from the signer
 * @returns The remaining time in milliseconds until delegation expires
 */
export const calculateDelegationExpirationMs = (
  delegationChain: DelegationChain,
): number => {
  // Find the earliest delegation expiration time
  const minExpirationNs = (() => {
    const delegations = delegationChain.delegations;
    if (!delegations || delegations.length === 0) {
      // No delegations: return current time in nanoseconds so remaining=0
      return BigInt(Date.now()) * NANOS_IN_MILLIS;
    }
    let min = BigInt(delegations[0].delegation.expiration);
    for (const d of delegations) {
      const ns = BigInt(d.delegation.expiration);
      if (ns < min) min = ns;
    }
    return min;
  })();

  const nowNs = BigInt(Date.now()) * NANOS_IN_MILLIS;
  const remainingNs = minExpirationNs - nowNs;

  // Convert remaining nanoseconds to milliseconds
  const remainingMsBigInt = remainingNs / NANOS_IN_MILLIS;
  return Number(remainingMsBigInt);
};
