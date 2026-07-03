import type { GateForUser } from "$lib/generated/cashier_backend/cashier_backend.did";
import {
  gateLabel,
  isGateOpen,
  isOtpGate,
  isXGate,
} from "$modules/gating/utils/gateHelpers";
import { describe, expect, it, vi } from "vitest";

vi.mock("$lib/i18n", () => ({
  locale: {
    t: (key: string) => key,
  },
}));

function buildGate(
  key: GateForUser["gate"]["key"],
  gateUserStatus: GateForUser["gate_user_status"] = [],
  id = "gate-1",
): GateForUser {
  return {
    gate: {
      id,
      key,
      creator: {} as GateForUser["gate"]["creator"],
      subject_id: "link-1",
    },
    gate_user_status: gateUserStatus,
  };
}

describe("isGateOpen", () => {
  it("returns true when the gate is locally marked open, regardless of backend status", () => {
    const gate = buildGate({ Password: "secret" }, [], "gate-1");
    expect(isGateOpen(gate, { "gate-1": true })).toBe(true);
  });

  it("returns true when backend status is Open", () => {
    const gate = buildGate({ Password: "secret" }, [
      {
        status: { Open: null },
        user_id: {} as GateForUser["gate"]["creator"],
        gate_id: "gate-1",
      },
    ]);
    expect(isGateOpen(gate, {})).toBe(true);
  });

  it("returns false when backend status is Closed and not locally open", () => {
    const gate = buildGate({ Password: "secret" }, [
      {
        status: { Closed: null },
        user_id: {} as GateForUser["gate"]["creator"],
        gate_id: "gate-1",
      },
    ]);
    expect(isGateOpen(gate, {})).toBe(false);
  });

  it("returns false when there is no backend status and not locally open", () => {
    const gate = buildGate({ Password: "secret" }, []);
    expect(isGateOpen(gate, {})).toBe(false);
  });

  it("does not consider a different gate's local open state", () => {
    const gate = buildGate({ Password: "secret" }, [], "gate-1");
    expect(isGateOpen(gate, { "gate-2": true })).toBe(false);
  });
});

const OTP_EMAIL_REDACTED = {
  OTPEmailRedacted: null,
} as unknown as GateForUser["gate"]["key"];
const OTP_SMS_REDACTED = {
  OTPSmsRedacted: null,
} as unknown as GateForUser["gate"]["key"];

describe("gateLabel", () => {
  it.each<[string, GateForUser["gate"]["key"]]>([
    ["links.linkForm.lock.password", { Password: "secret" }],
    ["links.linkForm.lock.password", { PasswordRedacted: null }],
    ["links.linkForm.lock.key1FollowAccount", { XFollowing: "@handle" }],
    ["links.linkForm.lock.keyOwnedAccount", { XOwnedAccount: "@handle" }],
    [
      "links.linkForm.lock.key2LikePost",
      { XLikedPost: "https://x.com/user/status/123" },
    ],
    [
      "links.linkForm.lock.key3RetweetPost",
      { XRetweetedPost: "https://x.com/user/status/123" },
    ],
    ["links.linkForm.lock.otp.email", { OTPEmail: "user@example.com" }],
    ["links.linkForm.lock.otp.email", OTP_EMAIL_REDACTED],
    ["links.linkForm.lock.otp.phone", { OTPSms: "+15550001234" }],
    ["links.linkForm.lock.otp.phone", OTP_SMS_REDACTED],
  ])("returns %s for %j", (expected, key) => {
    expect(gateLabel(buildGate(key))).toBe(expected);
  });

  it("returns Unknown for an unsupported gate key", () => {
    const gate = buildGate({
      DiscordServer: "server-1",
    } as GateForUser["gate"]["key"]);
    expect(gateLabel(gate)).toBe("Unknown");
  });
});

describe("isXGate", () => {
  it.each<GateForUser["gate"]["key"]>([
    { XFollowing: "@handle" },
    { XOwnedAccount: "@handle" },
    { XLikedPost: "https://x.com/user/status/123" },
    { XRetweetedPost: "https://x.com/user/status/123" },
  ])("returns true for %j", (key) => {
    expect(isXGate(buildGate(key))).toBe(true);
  });

  it.each<GateForUser["gate"]["key"]>([
    { Password: "secret" },
    { PasswordRedacted: null },
    { OTPEmail: "user@example.com" },
    { OTPSms: "+15550001234" },
  ])("returns false for %j", (key) => {
    expect(isXGate(buildGate(key))).toBe(false);
  });
});

describe("isOtpGate", () => {
  it.each<GateForUser["gate"]["key"]>([
    { OTPEmail: "user@example.com" },
    { OTPSms: "+15550001234" },
    OTP_EMAIL_REDACTED,
    OTP_SMS_REDACTED,
  ])("returns true for %j", (key) => {
    expect(isOtpGate(buildGate(key))).toBe(true);
  });

  it.each<GateForUser["gate"]["key"]>([
    { Password: "secret" },
    { PasswordRedacted: null },
    { XFollowing: "@handle" },
    { XOwnedAccount: "@handle" },
    { XLikedPost: "https://x.com/user/status/123" },
    { XRetweetedPost: "https://x.com/user/status/123" },
  ])("returns false for %j", (key) => {
    expect(isOtpGate(buildGate(key))).toBe(false);
  });
});
