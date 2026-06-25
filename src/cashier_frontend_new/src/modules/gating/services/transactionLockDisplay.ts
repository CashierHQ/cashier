import { locale } from "$lib/i18n";
import {
  FALLBACK_LOCK_VALUE_LENGTH,
  X_HANDLE_LOCK_TYPE,
} from "$modules/gating/constants";
import { GateType } from "$modules/gating/types/gate";
import type {
  GateKey,
  TransactionLockDisplay,
  TransactionLockInput,
} from "$modules/gating/types/transactionLockDisplay";

/**
 * Extracts the backend gate key when the lock comes from link details.
 *
 * @param lock - Transaction lock draft or backend gate to inspect.
 * @returns The backend gate key when present, otherwise `undefined`.
 */
function getGateKey(lock: TransactionLockInput): GateKey | undefined {
  if (!("gate" in lock) || typeof lock.gate !== "object" || !lock.gate) {
    return undefined;
  }

  return "key" in lock.gate &&
    typeof lock.gate.key === "object" &&
    lock.gate.key
    ? lock.gate.key
    : undefined;
}

/**
 * Resolves the lock type across backend gates and create-link drafts.
 *
 * @param lock - Transaction lock draft or backend gate to inspect.
 * @returns The normalized lock type used by lock display UI.
 */
function getLockType(lock: TransactionLockInput): string {
  const gateKey = getGateKey(lock);
  if (gateKey) {
    if ("Password" in gateKey || "PasswordRedacted" in gateKey) {
      return GateType.PASSWORD;
    }
    if ("XFollowing" in gateKey) {
      return X_HANDLE_LOCK_TYPE;
    }
  }

  return "type" in lock && typeof lock.type === "string" ? lock.type : "";
}

/**
 * Returns the translation key used for the lock row label.
 *
 * @param lock - Transaction lock draft or backend gate to inspect.
 * @returns The i18n key for the lock row label.
 */
function getLockLabelKey(lock: TransactionLockInput): string {
  const type = getLockType(lock);

  if (type === GateType.PASSWORD) {
    return "links.linkForm.lock.password";
  }

  if (type === X_HANDLE_LOCK_TYPE) {
    return "links.linkForm.lock.xHandle";
  }

  return "links.linkForm.lock.configuredLock";
}

/**
 * Returns the raw password only when the lock contains a revealable secret.
 *
 * @param lock - Transaction lock draft or backend gate to inspect.
 * @returns The revealable password value, or `undefined` when unavailable.
 */
function getSensitivePassword(lock: TransactionLockInput): string | undefined {
  const gateKey = getGateKey(lock);
  if (
    gateKey &&
    "Password" in gateKey &&
    typeof gateKey.Password === "string"
  ) {
    return gateKey.Password;
  }
  if ("password" in lock && typeof lock.password === "string") {
    return lock.password;
  }
  return undefined;
}

/**
 * Indicates whether a lock row can toggle between masked and revealed text.
 *
 * @param lock - Transaction lock draft or backend gate to inspect.
 * @returns `true` when the lock has a revealable sensitive value.
 */
function canRevealSensitiveValue(lock: TransactionLockInput): boolean {
  return (
    getLockType(lock) === GateType.PASSWORD &&
    getSensitivePassword(lock) !== undefined
  );
}

/**
 * Returns the display value for a lock, masking sensitive values by default.
 *
 * @param lock - Transaction lock draft or backend gate to inspect.
 * @param revealSensitiveValue - Whether revealable sensitive values should be shown.
 * @returns The value to render in the lock display row.
 */
function getLockValue(
  lock: TransactionLockInput,
  revealSensitiveValue = false,
): string {
  const type = getLockType(lock);

  if (type === GateType.PASSWORD) {
    const password = getSensitivePassword(lock);
    if (!password) return "*".repeat(FALLBACK_LOCK_VALUE_LENGTH);
    if (revealSensitiveValue) return password;
    return "*".repeat(Math.max(password.length, FALLBACK_LOCK_VALUE_LENGTH));
  }

  const gateKey = getGateKey(lock);
  if (gateKey) {
    if ("XFollowing" in gateKey && typeof gateKey.XFollowing === "string") {
      return gateKey.XFollowing;
    }
    if (
      "DiscordServer" in gateKey &&
      typeof gateKey.DiscordServer === "string"
    ) {
      return gateKey.DiscordServer;
    }
    if (
      "TelegramGroup" in gateKey &&
      typeof gateKey.TelegramGroup === "string"
    ) {
      return gateKey.TelegramGroup;
    }
  }

  return locale.t("links.linkForm.lock.configuredLock");
}

/**
 * Converts a draft/backend lock into a UI-ready display object.
 *
 * @param lock - Transaction lock draft or backend gate to convert.
 * @param options - Display options for sensitive values.
 * @returns Normalized display data for transaction lock UI.
 */
export function getTransactionLockDisplay(
  lock: TransactionLockInput,
  options: { revealSensitiveValue?: boolean } = {},
): TransactionLockDisplay {
  return {
    type: getLockType(lock),
    labelKey: getLockLabelKey(lock),
    value: getLockValue(lock, options.revealSensitiveValue),
    canRevealSensitiveValue: canRevealSensitiveValue(lock),
  };
}

/**
 * Builds a stable keyed-each value for transaction lock rows.
 *
 * @param lock - Transaction lock draft or backend gate to key.
 * @param index - Fallback row index used to keep keys stable for repeated lock types.
 * @returns A stable key for Svelte keyed each blocks.
 */
export function getTransactionLockStableKey(
  lock: TransactionLockInput,
  index: number,
): string {
  return `${getLockType(lock)}-${index}`;
}
