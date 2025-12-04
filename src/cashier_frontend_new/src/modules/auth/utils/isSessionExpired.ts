import { NANOS_IN_MILLIS, TIMEOUT_NANO_SEC } from "../constants";

/**
 * Check if the stored session has expired based on initialization timestamp.
 * @returns true if session is expired or no timestamp exists
 */
export const isSessionExpired = (expiredAtMs: number): boolean => {
  return (
    Date.now() - expiredAtMs >=
    Number(BigInt(TIMEOUT_NANO_SEC) / NANOS_IN_MILLIS)
  );
};
