import type { AuthenticationPopupHost } from "$modules/auth/signer/ii/type";
import { AUTHENTICATION_POPUP_CLOSED_ERROR_NAME } from "$modules/auth/signer/ii/constants";

export class AuthenticationPopupClosedError extends Error {
  constructor() {
    super("Authentication window was closed");
    this.name = AUTHENTICATION_POPUP_CLOSED_ERROR_NAME;
  }
}

export const isAuthenticationPopupClosedError = (
  error: unknown,
): error is AuthenticationPopupClosedError =>
  error instanceof Error &&
  error.name === AUTHENTICATION_POPUP_CLOSED_ERROR_NAME;

/**
 * Captures the popup opened synchronously by AuthClient.signIn() and rejects
 * when the user closes it. The SDK otherwise keeps a pending login alive for
 * up to five minutes before its heartbeat timeout expires.
 */
export const detectAuthenticationPopupClose = <T>(
  startAuthentication: () => Promise<T>,
  pollIntervalMs = 250,
  popupHost: AuthenticationPopupHost = window,
): Promise<T> => {
  const originalOpen = popupHost.open;
  let authenticationPopup: Window | null = null;

  const capturePopup = (
    url?: string | URL,
    target?: string,
    features?: string,
  ) => {
    const popup = originalOpen.call(popupHost as Window, url, target, features);
    authenticationPopup = popup;
    return popup;
  };

  popupHost.open = capturePopup;

  let authentication: Promise<T>;
  try {
    authentication = startAuthentication();
  } finally {
    popupHost.open = originalOpen;
  }

  if (!authenticationPopup) {
    return authentication;
  }

  return new Promise<T>((resolve, reject) => {
    let settled = false;
    const popup = authenticationPopup as Window;

    const finish = (callback: () => void) => {
      if (settled) return;
      settled = true;
      popupHost.clearInterval(closeCheck);
      callback();
    };

    const closeCheck = popupHost.setInterval(() => {
      if (popup.closed) {
        finish(() => {
          try {
            popupHost.focus();
          } catch {
            // Some browsers deny scripted focus changes. Closing the auth tab
            // must still settle the login attempt and restore the modal.
          }
          reject(new AuthenticationPopupClosedError());
        });
      }
    }, pollIntervalMs);

    authentication.then(
      (result) => finish(() => resolve(result)),
      (error) => finish(() => reject(error)),
    );
  });
};
