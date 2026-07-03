import type { GateForUser } from "$lib/generated/cashier_backend/cashier_backend.did";
import { locale } from "$lib/i18n";
import type {
  XGateDisplay,
  XGateType,
} from "$modules/gating/types/xGateDisplay";

/**
 * Resolves the display data for an X (Twitter) gate: its type, the target
 * value to show (handle or post URL), and the translated verify label.
 *
 * @param gate - The gate to resolve display data for.
 * @returns The gate's display data, with `gateType` set to `"unknown"` if the gate key isn't an X gate type.
 */
export function resolveXGateDisplay(gate: GateForUser): XGateDisplay {
  const key = gate.gate.key;

  const gateType: XGateType =
    "XFollowing" in key
      ? "following"
      : "XOwnedAccount" in key
        ? "owned"
        : "XLikedPost" in key
          ? "liked"
          : "XRetweetedPost" in key
            ? "retweeted"
            : "unknown";

  const targetValue =
    "XFollowing" in key
      ? key.XFollowing
      : "XOwnedAccount" in key
        ? key.XOwnedAccount
        : "XLikedPost" in key
          ? key.XLikedPost
          : "XRetweetedPost" in key
            ? key.XRetweetedPost
            : "";

  const verifyLabel =
    gateType === "following"
      ? locale.t("links.linkForm.lock.key2FollowAccount")
      : gateType === "owned"
        ? locale.t("links.linkForm.lock.keyOwnedAccount")
        : gateType === "liked"
          ? locale.t("links.linkForm.lock.key2LikePost")
          : gateType === "retweeted"
            ? locale.t("links.linkForm.lock.key3RetweetPost")
            : "Verify";

  return { gateType, targetValue, verifyLabel };
}
