import type { GateForUser } from "$lib/generated/cashier_backend/cashier_backend.did";
import { locale } from "$lib/i18n";

/**
 * Determines whether a gate is open, checking local overrides first and
 * falling back to the backend-reported gate status.
 *
 * @param gate - The gate to check.
 * @param localOpenGates - Map of gate id to whether it was opened locally (e.g. in the current session, before the backend status has been refreshed).
 * @returns `true` if the gate is open, either locally or per the backend status.
 */
export function isGateOpen(
  gate: GateForUser,
  localOpenGates: Record<string, boolean>,
): boolean {
  if (localOpenGates[gate.gate.id]) return true;
  const status = gate.gate_user_status[0]?.status;
  return status != null && "Open" in status;
}

/**
 * Resolves the display label for a gate, based on its key type.
 *
 * @param gate - The gate to label.
 * @returns The translated label for the gate's type, or `"Unknown"` if the gate key isn't recognized.
 */
export function gateLabel(gate: GateForUser): string {
  const key = gate.gate.key;
  if ("PasswordRedacted" in key || "Password" in key) {
    return locale.t("links.linkForm.lock.password") ?? "Password";
  }
  if ("XFollowing" in key) {
    return locale.t("links.linkForm.lock.key1FollowAccount");
  }
  if ("XOwnedAccount" in key) {
    return locale.t("links.linkForm.lock.keyOwnedAccount");
  }
  if ("XLikedPost" in key) {
    return locale.t("links.linkForm.lock.key2LikePost");
  }
  if ("XRetweetedPost" in key) {
    return locale.t("links.linkForm.lock.key3RetweetPost");
  }
  if ("OTPEmail" in key || "OTPEmailRedacted" in key) {
    return locale.t("links.linkForm.lock.otp.email");
  }
  if ("OTPSms" in key || "OTPSmsRedacted" in key) {
    return locale.t("links.linkForm.lock.otp.phone");
  }
  return "Unknown";
}

/**
 * Checks whether a gate is one of the X (Twitter) gate types.
 *
 * @param gate - The gate to check.
 * @returns `true` if the gate key is `XFollowing`, `XOwnedAccount`, `XLikedPost`, or `XRetweetedPost`.
 */
export function isXGate(gate: GateForUser): boolean {
  const key = gate.gate.key;
  return (
    "XFollowing" in key ||
    "XOwnedAccount" in key ||
    "XLikedPost" in key ||
    "XRetweetedPost" in key
  );
}

/**
 * Checks whether a gate is one of the OTP (email/SMS) gate types.
 *
 * @param gate - The gate to check.
 * @returns `true` if the gate key is `OTPEmail`, `OTPEmailRedacted`, `OTPSms`, or `OTPSmsRedacted`.
 */
export function isOtpGate(gate: GateForUser): boolean {
  const key = gate.gate.key;
  return (
    "OTPEmail" in key ||
    "OTPEmailRedacted" in key ||
    "OTPSms" in key ||
    "OTPSmsRedacted" in key
  );
}
