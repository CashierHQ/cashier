import type { AuthProvider } from "$modules/auth/types";

export type OpenIdLoginOption = {
  provider: AuthProvider;
  labelKey: string;
  iconSrc: string;
};
