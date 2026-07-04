import type { GateKey } from "$lib/generated/cashier_backend/cashier_backend.did";
import { GateType, type GateDraft } from "$modules/gating/types/gate";

export function gateDraftToGateKey(gateDraft: GateDraft): GateKey {
  switch (gateDraft.type) {
    case GateType.PASSWORD:
      return { Password: gateDraft.password };
    case GateType.X_FOLLOWING:
      return { XFollowing: gateDraft.targetHandle };
    case GateType.X_OWNED_ACCOUNT:
      return { XOwnedAccount: gateDraft.targetHandle };
    case GateType.X_LIKED_POST:
      return { XLikedPost: gateDraft.tweetUrl };
    case GateType.X_RETWEETED_POST:
      return { XRetweetedPost: gateDraft.tweetUrl };
    case GateType.OTP_EMAIL:
      return { OTPEmail: gateDraft.email };
    case GateType.OTP_SMS:
      return { OTPSms: gateDraft.phone };
  }
}
