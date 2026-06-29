export enum GateType {
  PASSWORD = "password",
  X_FOLLOWING = "x_following",
  X_OWNED_ACCOUNT = "x_owned_account",
  X_LIKED_POST = "x_liked_post",
  X_RETWEETED_POST = "x_retweeted_post",
  OTP_EMAIL = "otp_email",
  OTP_SMS = "otp_sms",
}

export type PasswordGateDraft = {
  type: GateType.PASSWORD;
  password: string;
};

export type XFollowingGateDraft = {
  type: GateType.X_FOLLOWING;
  targetHandle: string;
  rewardAccount: string;
};

export type XOwnedAccountGateDraft = {
  type: GateType.X_OWNED_ACCOUNT;
  targetHandle: string;
};

export type XLikedPostGateDraft = {
  type: GateType.X_LIKED_POST;
  tweetUrl: string;
};

export type XRetweetedPostGateDraft = {
  type: GateType.X_RETWEETED_POST;
  tweetUrl: string;
};

export type OTPEmailGateDraft = {
  type: GateType.OTP_EMAIL;
  email: string;
};

export type OTPSmsGateDraft = {
  type: GateType.OTP_SMS;
  phone: string;
  digits: string;
  countryCode: string;
};

export type GateDraft =
  | PasswordGateDraft
  | XFollowingGateDraft
  | XOwnedAccountGateDraft
  | XLikedPostGateDraft
  | XRetweetedPostGateDraft
  | OTPEmailGateDraft
  | OTPSmsGateDraft;
