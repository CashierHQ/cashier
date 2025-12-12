/**
 * Check if the stored session has expired based on expiration timestamp.
 * @param expiredAtMs - The timestamp (in milliseconds) when the session expires
 * @returns true if current time has passed the expiration timestamp
 */
export const isSessionExpired = (expiredAtMs: number): boolean => {
  return Date.now() >= expiredAtMs;
};
