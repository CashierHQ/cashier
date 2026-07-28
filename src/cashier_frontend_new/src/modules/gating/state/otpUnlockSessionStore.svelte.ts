import {
  EMPTY_OTP_DIGITS,
  INITIAL_OTP_UNLOCK_SESSION,
  OTP_EXPIRY_SECONDS,
} from "$modules/gating/constants";
import type { OTPUnlockSession } from "$modules/gating/types/otpUnlockSession";

class OTPUnlockSessionStore {
  #sessions = $state<Record<string, OTPUnlockSession>>({});

  /**
   * Gets the OTP unlock session for a lock key.
   *
   * @param key - The unique lock/session key.
   * @returns The existing session for the key, or a fresh initial session.
   */
  getSession(key: string): OTPUnlockSession {
    return (
      this.#sessions[key] ?? {
        ...INITIAL_OTP_UNLOCK_SESSION,
        digits: [...INITIAL_OTP_UNLOCK_SESSION.digits],
      }
    );
  }

  /**
   * Marks an OTP code as sent for a lock key.
   *
   * This moves the session to the code entry step, clears existing digits, and
   * starts the OTP expiry timer.
   *
   * @param key - The unique lock/session key.
   */
  markCodeSent(key: string): void {
    const now = Date.now();
    this.#sessions[key] = {
      step: "code",
      digits: [...EMPTY_OTP_DIGITS],
      expiresAtMs: now + OTP_EXPIRY_SECONDS * 1000,
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
   * Clears the OTP unlock session for a lock key.
   *
   * @param key - The unique lock/session key to remove.
   */
  clear(key: string): void {
    const remaining = { ...this.#sessions };
    delete remaining[key];
    this.#sessions = remaining;
  }
}

export const otpUnlockSessionStore = new OTPUnlockSessionStore();
