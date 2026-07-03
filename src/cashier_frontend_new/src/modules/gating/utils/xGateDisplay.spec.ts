import type { GateForUser } from "$lib/generated/cashier_backend/cashier_backend.did";
import { resolveXGateDisplay } from "$modules/gating/utils/xGateDisplay";
import { describe, expect, it, vi } from "vitest";

vi.mock("$lib/i18n", () => ({
  locale: {
    t: (key: string) => key,
  },
}));

function buildGate(key: GateForUser["gate"]["key"]): GateForUser {
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

describe("resolveXGateDisplay", () => {
  it("resolves an XFollowing gate", () => {
    const gate = buildGate({ XFollowing: "@cashierwallet" });

    expect(resolveXGateDisplay(gate)).toEqual({
      gateType: "following",
      targetValue: "@cashierwallet",
      verifyLabel: "links.linkForm.lock.key2FollowAccount",
    });
  });

  it("resolves an XOwnedAccount gate", () => {
    const gate = buildGate({ XOwnedAccount: "@myhandle" });

    expect(resolveXGateDisplay(gate)).toEqual({
      gateType: "owned",
      targetValue: "@myhandle",
      verifyLabel: "links.linkForm.lock.keyOwnedAccount",
    });
  });

  it("resolves an XLikedPost gate", () => {
    const gate = buildGate({
      XLikedPost: "https://x.com/user/status/123",
    });

    expect(resolveXGateDisplay(gate)).toEqual({
      gateType: "liked",
      targetValue: "https://x.com/user/status/123",
      verifyLabel: "links.linkForm.lock.key2LikePost",
    });
  });

  it("resolves an XRetweetedPost gate", () => {
    const gate = buildGate({
      XRetweetedPost: "https://x.com/user/status/456",
    });

    expect(resolveXGateDisplay(gate)).toEqual({
      gateType: "retweeted",
      targetValue: "https://x.com/user/status/456",
      verifyLabel: "links.linkForm.lock.key3RetweetPost",
    });
  });

  it("falls back to unknown for a non-X gate key", () => {
    const gate = buildGate({ Password: "secret" });

    expect(resolveXGateDisplay(gate)).toEqual({
      gateType: "unknown",
      targetValue: "",
      verifyLabel: "Verify",
    });
  });

  it("falls back to unknown for an XLikedPostCredential gate key", () => {
    const gate = buildGate({
      XLikedPostCredential: { user_id: "123", access_token: "token" },
    } as unknown as GateForUser["gate"]["key"]);

    expect(resolveXGateDisplay(gate)).toEqual({
      gateType: "unknown",
      targetValue: "",
      verifyLabel: "Verify",
    });
  });

  it("falls back to unknown for an XRetweetedPostCredential gate key", () => {
    const gate = buildGate({
      XRetweetedPostCredential: { user_id: "123" },
    } as unknown as GateForUser["gate"]["key"]);

    expect(resolveXGateDisplay(gate)).toEqual({
      gateType: "unknown",
      targetValue: "",
      verifyLabel: "Verify",
    });
  });
});
