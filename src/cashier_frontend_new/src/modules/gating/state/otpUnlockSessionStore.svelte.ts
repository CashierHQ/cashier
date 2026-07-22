import {
  OTP_EXPIRY_SECONDS,
  OTP_RESEND_COOLDOWN_SECONDS,
  OTP_VERIFY_RETRY_COOLDOWN_SECONDS,
} from "$modules/gating/constants";

type OTPUnlockStep = "verify" | "code";

type OTPUnlockSession = {
  step: OTPUnlockStep;
  digits: string[];
  expiresAtMs: number | null;
  resendAvailableAtMs: number | null;
  verifyAvailableAtMs: number | null;
};

/**
 * Creates an empty six-digit OTP input state.
 *
 * @returns A six-item array with one entry per OTP digit.
 */
const emptyDigits = () => ["", "", "", "", "", ""];

/**
 * Creates the default OTP unlock session state.
 *
 * @returns A session initialized to the verification step with no timers.
 */
const createInitialSession = (): OTPUnlockSession => ({
  step: "verify",
  digits: emptyDigits(),
  expiresAtMs: null,
  resendAvailableAtMs: null,
  verifyAvailableAtMs: null,
});

class OTPUnlockSessionStore {
  #sessions = $state<Record<string, OTPUnlockSession>>({});

  /**
   * Gets the OTP unlock session for a lock key.
   *
   * @param key - The unique lock/session key.
   * @returns The existing session for the key, or a fresh initial session.
   */
  getSession(key: string): OTPUnlockSession {
    return this.#sessions[key] ?? createInitialSession();
  }

  /**
   * Marks an OTP code as sent for a lock key.
   *
   * This moves the session to the code entry step, clears existing digits, and
   * starts both the OTP expiry and resend cooldown timers.
   *
   * @param key - The unique lock/session key.
   */
  markCodeSent(key: string): void {
    const now = Date.now();
    this.#sessions[key] = {
      step: "code",
      digits: emptyDigits(),
      expiresAtMs: now + OTP_EXPIRY_SECONDS * 1000,
      resendAvailableAtMs: now + OTP_RESEND_COOLDOWN_SECONDS * 1000,
      verifyAvailableAtMs: null,
    };
  }

  /**
   * Stores the current OTP digits for a lock key.
   *
   * @param key - The unique lock/session key.
   * @param digits - The OTP digits entered by the user.
   */
  setDigits(key: string, digits: string[]): void {
    const session = this.getSession(key);
    this.#sessions[key] = {
      ...session,
      digits: digits.slice(0, 6),
    };
  }

  /**
   * Starts the verification retry cooldown for a lock key.
   *
   * @param key - The unique lock/session key.
   * @param seconds - The cooldown duration in seconds.
   */
  setVerifyCooldown(
    key: string,
    seconds = OTP_VERIFY_RETRY_COOLDOWN_SECONDS,
  ): void {
    const session = this.getSession(key);
    this.#sessions[key] = {
      ...session,
      verifyAvailableAtMs: Date.now() + seconds * 1000,
    };
  }

  /**
   * Clears the OTP unlock session for a lock key.
   *
   * @param key - The unique lock/session key to remove.
   */
  clear(key: string): void {
    const { [key]: _removed, ...remaining } = this.#sessions;
    this.#sessions = remaining;
  }
}

export const otpUnlockSessionStore = new OTPUnlockSessionStore();
