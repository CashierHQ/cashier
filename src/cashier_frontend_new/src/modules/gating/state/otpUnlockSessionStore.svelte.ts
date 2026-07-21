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

const emptyDigits = () => ["", "", "", "", "", ""];

const createInitialSession = (): OTPUnlockSession => ({
  step: "verify",
  digits: emptyDigits(),
  expiresAtMs: null,
  resendAvailableAtMs: null,
  verifyAvailableAtMs: null,
});

class OTPUnlockSessionStore {
  #sessions = $state<Record<string, OTPUnlockSession>>({});

  getSession(key: string): OTPUnlockSession {
    return this.#sessions[key] ?? createInitialSession();
  }

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

  setDigits(key: string, digits: string[]): void {
    const session = this.getSession(key);
    this.#sessions[key] = {
      ...session,
      digits: digits.slice(0, 6),
    };
  }

  setVerifyCooldown(key: string, seconds = OTP_VERIFY_RETRY_COOLDOWN_SECONDS) {
    const session = this.getSession(key);
    this.#sessions[key] = {
      ...session,
      verifyAvailableAtMs: Date.now() + seconds * 1000,
    };
  }

  clear(key: string): void {
    const { [key]: _removed, ...remaining } = this.#sessions;
    this.#sessions = remaining;
  }
}

export const otpUnlockSessionStore = new OTPUnlockSessionStore();
