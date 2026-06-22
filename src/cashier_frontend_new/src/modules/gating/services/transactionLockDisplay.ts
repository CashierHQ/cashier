import type { GateForUser } from "$lib/generated/cashier_backend/cashier_backend.did";
import { locale } from "$lib/i18n";
import { GateType } from "$modules/gating/types/gate";
import type {
  TransactionLockDisplay,
  TransactionLockInput,
} from "$modules/gating/types/transactionLockDisplay";

const FALLBACK_LOCK_VALUE_LENGTH = 12;
const X_HANDLE_LOCK_TYPE = "xHandle";

type GateKey = GateForUser["gate"]["key"];

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

function canRevealSensitiveValue(lock: TransactionLockInput): boolean {
  return (
    getLockType(lock) === GateType.PASSWORD &&
    getSensitivePassword(lock) !== undefined
  );
}

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

export function getTransactionLockStableKey(
  lock: TransactionLockInput,
  index: number,
): string {
  return `${getLockType(lock)}-${index}`;
}
