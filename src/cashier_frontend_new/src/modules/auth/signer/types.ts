/**
 * Result of a single sub-request settling inside an `icrc112_batch_call_canister`
 * batch, identified by its position within the 2D sequence/parallel request array.
 */
export type BatchCallProgress = {
  sequenceIndex: number;
  parallelIndex: number;
  response:
    | { result: { contentMap: string; certificate: string } }
    | { error: { code: number; message: string; data?: unknown } };
};

/**
 * Structural type for channels that support the additive `onBatchProgress`
 * hook, so consumers (e.g. `Icrc112Service`) can feature-detect it without a
 * hard dependency on any concrete signer's channel implementation.
 */
export type ChannelWithBatchProgress = {
  onBatchProgress: (
    listener: (progress: BatchCallProgress) => void,
  ) => () => void;
};
