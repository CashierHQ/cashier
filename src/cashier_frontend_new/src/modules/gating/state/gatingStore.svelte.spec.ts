import { describe, expect, it } from "vitest";
import { GatingStore } from "$modules/gating/state/gatingStore.svelte";
import { GateType } from "$modules/gating/types/gate";

describe("GatingStore OTP confirmation", () => {
  it("it_should_do_save_email_otp_lock_when_confirmation_matches", () => {
    const store = new GatingStore();

    store.setOTPEmailDraft("user@example.com");
    store.setOTPEmailConfirmDraft("user@example.com");
    store.saveOTPEmailLock();

    expect(store.gateDrafts).toEqual([
      {
        type: GateType.OTP_EMAIL,
        email: "user@example.com",
      },
    ]);
  });

  it("it_should_do_reject_email_otp_lock_when_confirmation_does_not_match", () => {
    const store = new GatingStore();

    store.setOTPEmailDraft("user@example.com");
    store.setOTPEmailConfirmDraft("other@example.com");
    store.saveOTPEmailLock();

    expect(store.hasConfiguredOTPEmail).toBe(false);
    expect(store.gateDrafts).toEqual([]);
  });

  it("it_should_do_save_sms_otp_lock_when_confirmation_matches", () => {
    const store = new GatingStore();

    store.setOTPPhoneDraft("+15551234567");
    store.setOTPPhoneConfirmDraft("+15551234567");
    store.setOTPPhoneConfirmDigits("5551234567");
    store.saveOTPSmsLock("5551234567", "US");

    expect(store.gateDrafts).toEqual([
      {
        type: GateType.OTP_SMS,
        phone: "+15551234567",
        digits: "5551234567",
        countryCode: "US",
      },
    ]);
  });

  it("it_should_do_reject_sms_otp_lock_when_confirmation_does_not_match", () => {
    const store = new GatingStore();

    store.setOTPPhoneDraft("+15551234567");
    store.setOTPPhoneConfirmDraft("+15557654321");
    store.setOTPPhoneConfirmDigits("5557654321");
    store.saveOTPSmsLock("5551234567", "US");

    expect(store.hasConfiguredOTPSms).toBe(false);
    expect(store.gateDrafts).toEqual([]);
  });
});

describe("GatingStore lock removal", () => {
  it("it_should_do_remove_password_lock_without_removing_other_locks", () => {
    const store = new GatingStore();

    store.setPassword("secret");
    store.setConfirmPassword("secret");
    store.savePasswordLock();
    store.setOTPEmailDraft("user@example.com");
    store.setOTPEmailConfirmDraft("user@example.com");
    store.saveOTPEmailLock();

    store.removePasswordLock();

    expect(store.hasConfiguredPassword).toBe(false);
    expect(store.password).toBe("");
    expect(store.confirmPassword).toBe("");
    expect(store.gateDrafts).toEqual([
      {
        type: GateType.OTP_EMAIL,
        email: "user@example.com",
      },
    ]);
  });

  it("it_should_do_remove_all_x_locks_without_removing_other_locks", () => {
    const store = new GatingStore();

    store.setXOwnedAccountDraft("owner");
    store.saveXOwnedAccountLock();
    store.setXFollowingDraft("cashier");
    store.saveXFollowingLock();
    store.setXLikedPostDraft("https://x.com/user/status/123");
    store.saveXLikedPostLock();
    store.setXRetweetedPostDraft("https://x.com/user/status/456");
    store.saveXRetweetedPostLock();
    store.setPassword("secret");
    store.setConfirmPassword("secret");
    store.savePasswordLock();

    store.removeXLocks();

    expect(store.hasConfiguredAnyX).toBe(false);
    expect(store.xOwnedAccountDraft).toBe("");
    expect(store.xFollowingDraft).toBe("");
    expect(store.xRewardAccountDraft).toBe("");
    expect(store.xLikedPostDraft).toBe("");
    expect(store.xRetweetedPostDraft).toBe("");
    expect(store.gateDrafts).toEqual([
      {
        type: GateType.PASSWORD,
        password: "secret",
      },
    ]);
  });

  it("it_should_do_remove_email_otp_lock_without_removing_sms_lock", () => {
    const store = new GatingStore();

    store.setOTPEmailDraft("user@example.com");
    store.setOTPEmailConfirmDraft("user@example.com");
    store.saveOTPEmailLock();
    store.setOTPPhoneDraft("+15551234567");
    store.setOTPPhoneConfirmDraft("+15551234567");
    store.setOTPPhoneConfirmDigits("5551234567");
    store.saveOTPSmsLock("5551234567", "US");

    store.removeOTPEmailLock();

    expect(store.hasConfiguredOTPEmail).toBe(false);
    expect(store.otpEmailDraft).toBe("");
    expect(store.otpEmailConfirmDraft).toBe("");
    expect(store.gateDrafts).toEqual([
      {
        type: GateType.OTP_SMS,
        phone: "+15551234567",
        digits: "5551234567",
        countryCode: "US",
      },
    ]);
  });

  it("it_should_do_remove_sms_otp_lock_without_removing_email_lock", () => {
    const store = new GatingStore();

    store.setOTPEmailDraft("user@example.com");
    store.setOTPEmailConfirmDraft("user@example.com");
    store.saveOTPEmailLock();
    store.setOTPPhoneDraft("+15551234567");
    store.setOTPPhoneConfirmDraft("+15551234567");
    store.setOTPPhoneConfirmDigits("5551234567");
    store.saveOTPSmsLock("5551234567", "US");

    store.removeOTPSmsLock();

    expect(store.hasConfiguredOTPSms).toBe(false);
    expect(store.otpPhoneDraft).toBe("");
    expect(store.otpPhoneConfirmDraft).toBe("");
    expect(store.otpPhoneDigits).toBe("");
    expect(store.otpPhoneConfirmDigits).toBe("");
    expect(store.otpCountryCode).toBe("");
    expect(store.gateDrafts).toEqual([
      {
        type: GateType.OTP_EMAIL,
        email: "user@example.com",
      },
    ]);
  });
});
