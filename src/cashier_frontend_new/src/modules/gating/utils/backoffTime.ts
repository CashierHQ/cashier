import { locale } from "$lib/i18n";

/**
 * Formats a backoff duration as a translated "N minutes"/"N seconds" string,
 * rounding up to the nearest minute once the duration reaches 60 seconds.
 *
 * @param remainingSecs - The remaining backoff duration, in seconds.
 * @returns The translated, human-readable duration text.
 */
export function getBackoffTimeText(remainingSecs: number): string {
  const key =
    remainingSecs >= 60
      ? "links.linkForm.lock.otp.timeMinutes"
      : "links.linkForm.lock.otp.timeSeconds";
  const count =
    remainingSecs >= 60 ? Math.ceil(remainingSecs / 60) : remainingSecs;
  return locale.t(key).replace("{{count}}", String(count));
}
