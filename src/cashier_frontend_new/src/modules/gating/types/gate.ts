/**
 * Identifies the kind of lock/gate that can be attached to a link.
 */
export enum GateType {
  PASSWORD = "password",
  X_FOLLOWING = "x_following",
  X_OWNED_ACCOUNT = "x_owned_account",
  X_LIKED_POST = "x_liked_post",
  X_RETWEETED_POST = "x_retweeted_post",
  OTP_EMAIL = "otp_email",
  OTP_SMS = "otp_sms",
}

/**
 * Draft configuration for a password gate, before it's saved to the backend.
 */
export type PasswordGateDraft = {
  type: GateType.PASSWORD;
  password: string;
};

/**
 * Draft configuration for an X (Twitter) "follow account" gate.
 */
export type XFollowingGateDraft = {
  type: GateType.X_FOLLOWING;
  targetHandle: string;
  rewardAccount: string;
};

/**
 * Draft configuration for an X (Twitter) "own an account" gate.
 */
export type XOwnedAccountGateDraft = {
  type: GateType.X_OWNED_ACCOUNT;
  targetHandle: string;
};

/**
 * Draft configuration for an X (Twitter) "like a post" gate.
 */
export type XLikedPostGateDraft = {
  type: GateType.X_LIKED_POST;
  tweetUrl: string;
};

/**
 * Draft configuration for an X (Twitter) "retweet a post" gate.
 */
export type XRetweetedPostGateDraft = {
  type: GateType.X_RETWEETED_POST;
  tweetUrl: string;
};

/**
 * Draft configuration for an email OTP gate.
 */
export type OTPEmailGateDraft = {
  type: GateType.OTP_EMAIL;
  email: string;
};

/**
 * Draft configuration for an SMS OTP gate.
 */
export type OTPSmsGateDraft = {
  type: GateType.OTP_SMS;
  phone: string;
  digits: string;
  countryCode: string;
};

/**
 * Union of all gate draft shapes, discriminated by `type`.
 */
export type GateDraft =
  | PasswordGateDraft
  | XFollowingGateDraft
  | XOwnedAccountGateDraft
  | XLikedPostGateDraft
  | XRetweetedPostGateDraft
  | OTPEmailGateDraft
  | OTPSmsGateDraft;
