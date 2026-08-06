import type { OpenIdProvider } from "@icp-sdk/auth/client";
import { INTERNET_IDENTITY_AUTH_PROVIDER } from "$modules/auth/constants";
import { isAuthenticationPopupClosedError } from "$modules/auth/signer/ii/authenticationPopup";
import type { AuthLoginResult, AuthProvider } from "$modules/auth/types";

type ConnectWithInternetIdentity = (
  openIdProvider?: OpenIdProvider,
) => Promise<void>;

/**
 * Authenticates with Internet Identity using the selected login provider.
 *
 * This is the boundary between provider-oriented UI code and the lower-level
 * Internet Identity adapter. Expected tab abandonment is returned as a result;
 * unexpected authentication failures continue to reject.
 *
 * @param provider - The login provider selected by the user.
 * @param connect - The Internet Identity connection operation.
 * @returns Whether authentication completed or was cancelled by the user.
 * @throws Unexpected connection and authentication errors.
 */
export const authenticateWithInternetIdentity = async (
  provider: AuthProvider,
  connect: ConnectWithInternetIdentity,
): Promise<AuthLoginResult> => {
  const openIdProvider =
    provider === INTERNET_IDENTITY_AUTH_PROVIDER ? undefined : provider;

  try {
    await connect(openIdProvider);
    return { status: "authenticated" };
  } catch (error) {
    if (isAuthenticationPopupClosedError(error)) {
      return { status: "cancelled" };
    }
    throw error;
  }
};
