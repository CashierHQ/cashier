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

  it("it_should_do_return_x_following_display_for_backend_x_following_lock", () => {
    const lock = buildGateForUser({ XFollowing: "@cashierwallet" });

    expect(getTransactionLockDisplay(lock)).toEqual({
      type: GateType.X_FOLLOWING,
      labelKey: "links.linkForm.lock.key1FollowAccount",
      value: "@cashierwallet",
      canRevealSensitiveValue: false,
    });
  });

  it("it_should_do_return_x_owned_account_display_for_backend_x_owned_account_lock", () => {
    const lock = buildGateForUser({ XOwnedAccount: "@myhandle" });

    expect(getTransactionLockDisplay(lock)).toEqual({
      type: GateType.X_OWNED_ACCOUNT,
      labelKey: "links.linkForm.lock.keyOwnedAccount",
      value: "@myhandle",
      canRevealSensitiveValue: false,
    });
  });

  it("it_should_do_return_x_liked_post_display_for_backend_x_liked_post_lock", () => {
    const lock = buildGateForUser({
      XLikedPost: "https://x.com/user/status/123",
    });

    expect(getTransactionLockDisplay(lock)).toEqual({
      type: GateType.X_LIKED_POST,
      labelKey: "links.linkForm.lock.key2LikePost",
      value: "https://x.com/user/status/123",
      canRevealSensitiveValue: false,
    });
  });

  it("it_should_do_return_x_retweeted_post_display_for_backend_x_retweeted_post_lock", () => {
    const lock = buildGateForUser({
      XRetweetedPost: "https://x.com/user/status/456",
    });

    expect(getTransactionLockDisplay(lock)).toEqual({
      type: GateType.X_RETWEETED_POST,
      labelKey: "links.linkForm.lock.key3RetweetPost",
      value: "https://x.com/user/status/456",
      canRevealSensitiveValue: false,
    });
  });

  it("it_should_do_return_otp_email_display_for_backend_otp_email_lock", () => {
    const lock = buildGateForUser({ OTPEmail: "user@example.com" });

    expect(getTransactionLockDisplay(lock)).toEqual({
      type: GateType.OTP_EMAIL,
      labelKey: "links.linkForm.lock.otp.email",
      value: "user@example.com",
      canRevealSensitiveValue: false,
    });
  });

  it("it_should_do_return_otp_sms_display_for_backend_otp_sms_lock", () => {
    const lock = buildGateForUser({ OTPSms: "+15550001234" });

    expect(getTransactionLockDisplay(lock)).toEqual({
      type: GateType.OTP_SMS,
      labelKey: "links.linkForm.lock.otp.phone",
      value: "+15550001234",
      canRevealSensitiveValue: false,
    });
  });

  it("it_should_do_return_x_following_display_for_draft_x_following_lock", () => {
    const lock: TransactionLockInput = {
      type: GateType.X_FOLLOWING,
      targetHandle: "@elonmusk",
      rewardAccount: "reward-account",
    };

    expect(getTransactionLockDisplay(lock)).toEqual({
      type: GateType.X_FOLLOWING,
      labelKey: "links.linkForm.lock.key1FollowAccount",
      value: "@elonmusk",
      canRevealSensitiveValue: false,
    });
  });

  it("it_should_do_return_x_owned_account_display_for_draft_x_owned_account_lock", () => {
    const lock: TransactionLockInput = {
      type: GateType.X_OWNED_ACCOUNT,
      targetHandle: "@myhandle",
    };

    expect(getTransactionLockDisplay(lock)).toEqual({
      type: GateType.X_OWNED_ACCOUNT,
      labelKey: "links.linkForm.lock.keyOwnedAccount",
      value: "@myhandle",
      canRevealSensitiveValue: false,
    });
  });

  it("it_should_do_return_x_liked_post_display_for_draft_x_liked_post_lock", () => {
    const lock: TransactionLockInput = {
      type: GateType.X_LIKED_POST,
      tweetUrl: "https://x.com/user/status/123",
    };

    expect(getTransactionLockDisplay(lock)).toEqual({
      type: GateType.X_LIKED_POST,
      labelKey: "links.linkForm.lock.key2LikePost",
      value: "https://x.com/user/status/123",
      canRevealSensitiveValue: false,
    });
  });

  it("it_should_do_return_x_retweeted_post_display_for_draft_x_retweeted_post_lock", () => {
    const lock: TransactionLockInput = {
      type: GateType.X_RETWEETED_POST,
      tweetUrl: "https://x.com/user/status/456",
    };

    expect(getTransactionLockDisplay(lock)).toEqual({
      type: GateType.X_RETWEETED_POST,
      labelKey: "links.linkForm.lock.key3RetweetPost",
      value: "https://x.com/user/status/456",
      canRevealSensitiveValue: false,
    });
  });

  it("it_should_do_return_otp_email_display_for_draft_otp_email_lock", () => {
    const lock: TransactionLockInput = {
      type: GateType.OTP_EMAIL,
      email: "user@example.com",
    };

    expect(getTransactionLockDisplay(lock)).toEqual({
      type: GateType.OTP_EMAIL,
      labelKey: "links.linkForm.lock.otp.email",
      value: "user@example.com",
      canRevealSensitiveValue: false,
    });
  });

  it("it_should_do_return_otp_sms_display_for_draft_otp_sms_lock", () => {
    const lock: TransactionLockInput = {
      type: GateType.OTP_SMS,
      phone: "+15550001234",
      digits: "5550001234",
      countryCode: "US",
    };

    expect(getTransactionLockDisplay(lock)).toEqual({
      type: GateType.OTP_SMS,
      labelKey: "links.linkForm.lock.otp.phone",
      value: "+15550001234",
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
