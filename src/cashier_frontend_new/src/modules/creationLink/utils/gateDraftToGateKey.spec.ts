import { gateDraftToGateKey } from "$modules/creationLink/utils/gateDraftToGateKey";
import { GateType, type GateDraft } from "$modules/gating/types/gate";
import { describe, expect, it } from "vitest";

describe("gateDraftToGateKey", () => {
  it.each([
    [
      "password",
      { type: GateType.PASSWORD, password: "secret" },
      { Password: "secret" },
    ],
    [
      "x following",
      {
        type: GateType.X_FOLLOWING,
        targetHandle: "cashierapp",
        rewardAccount: "reward-account",
      },
      { XFollowing: "cashierapp" },
    ],
    [
      "x owned account",
      { type: GateType.X_OWNED_ACCOUNT, targetHandle: "cashierapp" },
      { XOwnedAccount: "cashierapp" },
    ],
    [
      "x liked post",
      { type: GateType.X_LIKED_POST, tweetUrl: "https://x.com/a/status/1" },
      { XLikedPost: "https://x.com/a/status/1" },
    ],
    [
      "x retweeted post",
      { type: GateType.X_RETWEETED_POST, tweetUrl: "https://x.com/a/status/2" },
      { XRetweetedPost: "https://x.com/a/status/2" },
    ],
    [
      "otp email",
      { type: GateType.OTP_EMAIL, email: "user@example.com" },
      { OTPEmail: "user@example.com" },
    ],
    [
      "otp sms",
      {
        type: GateType.OTP_SMS,
        phone: "+15555550123",
        digits: "5555550123",
        countryCode: "US",
      },
      { OTPSms: "+15555550123" },
    ],
  ] satisfies Array<[string, GateDraft, unknown]>)(
    "it_should_map_%s_gate_draft_to_backend_gate_key",
    (_, gateDraft, gateKey) => {
      expect(gateDraftToGateKey(gateDraft)).toEqual(gateKey);
    },
  );
});
