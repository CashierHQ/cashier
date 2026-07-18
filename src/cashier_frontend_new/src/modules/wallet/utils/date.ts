/**
 * Formats a timestamp into a readable date string
 * @param timestamp - Unix timestamp in milliseconds
 * @returns Formatted date string (e.g., "Jan 15, 2024")
 */
export function formatDate(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

const dateKeyFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: "UTC",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/**
 * Generates a unique date key for grouping transactions
 * @param timestamp - Unix timestamp in milliseconds
 * @returns Date key in format "YYYY-MM-DD"
 */
export function getDateKey(timestamp: number): string {
  return dateKeyFormatter.format(new Date(timestamp));
}
