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
