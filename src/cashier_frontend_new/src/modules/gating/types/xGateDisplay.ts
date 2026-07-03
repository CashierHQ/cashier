/**
 * The subtype of an X (Twitter) gate, used to pick the credential shape and
 * display copy for it. `"unknown"` covers unsupported or credential-only
 * gate keys (e.g. `XLikedPostCredential`).
 */
export type XGateType =
  | "following"
  | "owned"
  | "liked"
  | "retweeted"
  | "unknown";

/**
 * Display data resolved for an X (Twitter) gate, ready for UI rendering.
 */
export type XGateDisplay = {
  gateType: XGateType;
  targetValue: string;
  verifyLabel: string;
};
