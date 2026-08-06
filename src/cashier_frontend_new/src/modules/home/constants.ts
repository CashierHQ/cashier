import type { OpenIdLoginOption } from "$modules/home/types";
import { INTERNET_IDENTITY_AUTH_PROVIDER } from "$modules/auth/constants";

export const GOOGLE_LOGIN_OPTION: OpenIdLoginOption = {
  provider: "google",
  labelKey: "home.loginModal.signInWithGoogle",
  iconSrc: "/social-icon.svg",
};

export const SECONDARY_OPEN_ID_LOGIN_OPTIONS: OpenIdLoginOption[] = [
  {
    provider: "apple",
    labelKey: "home.loginModal.signInWithApple",
    iconSrc: "/apple-icon.svg",
  },
  {
    provider: "microsoft",
    labelKey: "home.loginModal.signInWithMicrosoft",
    iconSrc: "/microsoft-icon.svg",
  },
];

export const INTERNET_IDENTITY_LOGIN_OPTION: OpenIdLoginOption = {
  provider: INTERNET_IDENTITY_AUTH_PROVIDER,
  labelKey: "home.loginModal.internetIdentity",
  iconSrc: "/icp-logo-mark.svg",
};
