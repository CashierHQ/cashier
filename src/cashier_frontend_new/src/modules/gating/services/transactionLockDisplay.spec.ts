import type { GateForUser } from "$lib/generated/cashier_backend/cashier_backend.did";
import {
  getTransactionLockDisplay,
  getTransactionLockStableKey,
} from "$modules/gating/services/transactionLockDisplay";
import type { TransactionLockInput } from "$modules/gating/types/transactionLockDisplay";
import { GateType } from "$modules/gating/types/gate";
import { describe, expect, it, vi } from "vitest";

vi.mock("$lib/i18n", () => ({
  locale: {
    t: (key: string) => key,
  },
}));

function buildGateForUser(key: GateForUser["gate"]["key"]): GateForUser {
  return {
    gate: {
      id: "gate-1",
      key,
      creator: {} as GateForUser["gate"]["creator"],
      subject_id: "link-1",
    },
    gate_user_status: [],
  };
}

describe("transactionLockDisplay", () => {
  it("it_should_do_mask_and_reveal_draft_password_lock", () => {
    const lock: TransactionLockInput = {
      type: GateType.PASSWORD,
      password: "secret",
    };

    expect(getTransactionLockDisplay(lock)).toEqual({
      type: GateType.PASSWORD,
      labelKey: "links.linkForm.lock.password",
      value: "************",
      canRevealSensitiveValue: true,
    });
    expect(
      getTransactionLockDisplay(lock, { revealSensitiveValue: true }).value,
    ).toBe("secret");
  });

  it("it_should_do_mask_and_reveal_backend_password_lock", () => {
    const lock = buildGateForUser({ Password: "backend-secret" });

    expect(getTransactionLockDisplay(lock)).toEqual({
      type: GateType.PASSWORD,
      labelKey: "links.linkForm.lock.password",
      value: "**************",
      canRevealSensitiveValue: true,
    });
    expect(
      getTransactionLockDisplay(lock, { revealSensitiveValue: true }).value,
    ).toBe("backend-secret");
  });

  it("it_should_do_mask_redacted_backend_password_without_reveal", () => {
    const lock = buildGateForUser({ PasswordRedacted: null });

    expect(getTransactionLockDisplay(lock)).toEqual({
      type: GateType.PASSWORD,
      labelKey: "links.linkForm.lock.password",
      value: "************",
      canRevealSensitiveValue: false,
    });
  });

  it("it_should_do_return_x_handle_display_for_backend_x_following_lock", () => {
    const lock = buildGateForUser({ XFollowing: "@cashierwallet" });

    expect(getTransactionLockDisplay(lock)).toEqual({
      type: "xHandle",
      labelKey: "links.linkForm.lock.xHandle",
      value: "@cashierwallet",
      canRevealSensitiveValue: false,
    });
  });

  it("it_should_do_return_configured_lock_display_for_unknown_backend_lock", () => {
    const lock = buildGateForUser({
      UnsupportedGate: "unsupported",
    } as unknown as GateForUser["gate"]["key"]);

    expect(getTransactionLockDisplay(lock)).toEqual({
      type: "",
      labelKey: "links.linkForm.lock.configuredLock",
      value: "links.linkForm.lock.configuredLock",
      canRevealSensitiveValue: false,
    });
  });

  it("it_should_do_return_stable_key_from_lock_type_and_index", () => {
    expect(
      getTransactionLockStableKey(
        {
          type: GateType.PASSWORD,
          password: "secret",
        },
        3,
      ),
    ).toBe("password-3");
  });
});
