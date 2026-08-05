import type { OpenIdProvider } from "@icp-sdk/auth/client";

export type OpenIdLoginOption = {
  provider: OpenIdProvider;
  labelKey: string;
  iconSrc: string;
};
