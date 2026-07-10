import { sha256 } from "@noble/hashes/sha2.js";

/**
 * Some ICRC ledgers cap the memo field at 16 bytes (rather than the ICRC-1
 * default of 32), so the deduplication memo must fit within 16 bytes.
 *
 * Returns the first 16 bytes of the SHA-256 digest of the UTF-8 encoded
 * input, which is fully deterministic across platforms and runtimes and
 * still has 2^-128 collision probability - far below what dedup needs.
 */
export function createDeduplicationMemo(input: string): Uint8Array {
  const bytes = new TextEncoder().encode(input);
  return sha256(bytes).slice(0, 16);
}
