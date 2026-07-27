/**
 * Current step in the OTP unlock flow.
 */
export type OTPUnlockStep = "verify" | "code";

/**
 * Client-side state for an OTP unlock attempt.
 */
export type OTPUnlockSession = {
  step: OTPUnlockStep;
  digits: string[];
  expiresAtMs: number | null;
};
