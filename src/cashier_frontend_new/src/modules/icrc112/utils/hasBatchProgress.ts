import type { ChannelWithBatchProgress } from "$modules/auth/signer/types";

/**
 * Type guard: does this channel support the additive `onBatchProgress` hook?
 * Lets callers (e.g. `Icrc112Service`) feature-detect per-request progress
 * without a hard dependency on any concrete signer's channel implementation.
 * @param channel - the channel instance to check
 */
export function hasBatchProgress(
  channel: unknown,
): channel is ChannelWithBatchProgress {
  return (
    typeof channel === "object" &&
    channel !== null &&
    typeof (channel as Partial<ChannelWithBatchProgress>).onBatchProgress ===
      "function"
  );
}
