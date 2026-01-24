/**
 * Get the current timestamp in seconds.
 * @returns Current timestamp in seconds
 */
export const currentSecondTimestamp = (): number => {
  return Math.floor(Date.now() / 1000);
};
