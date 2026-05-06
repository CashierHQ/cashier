import { sha256 } from "@noble/hashes/sha2.js";

/**
 * ICRC memo must be at most 32 bytes.
 *
 * Returns the SHA-256 digest of the UTF-8 encoded input, which is exactly
 * 32 bytes and fully deterministic across platforms and runtimes.
 */
export function createDeduplicationMemo32(input: string): Uint8Array {
  const bytes = new TextEncoder().encode(input);
  return sha256(bytes);
}
