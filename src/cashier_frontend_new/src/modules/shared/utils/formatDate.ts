/**
 * Formats a timestamp in nanoseconds to a human-readable date string.
 * @param ts - The timestamp in nanoseconds as a bigint
 * @returns A formatted date string in "Mon DD, YYYY" format, or empty string for invalid/zero timestamps
 */
export function formatDate(ts: bigint) {
  if (ts === 0n) return "";
  const ms = Number(ts / 1000000n);
  const d = new Date(ms);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
