// Delegation timeout: 1 hour in nanoseconds
export const DELEGATION_TIMEOUT_NS = BigInt(60 * 60 * 1_000_000_000);

// Idle timeout: 15 minutes in milliseconds (matches cashier)
export const IDLE_TIMEOUT_MS = 15 * 60 * 1000;
