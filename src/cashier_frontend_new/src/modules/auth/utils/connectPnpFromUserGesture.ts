import { PnpState, type PNP } from "@windoge98/plug-n-play";
import type {
  PnpConnectionResult,
  PnpUserGestureInternals,
} from "$modules/auth/types";

/**
 * Starts the adapter connection before yielding back to the browser.
 *
 * PNP's public connect() awaits its CONNECTING state transition before it
 * invokes the adapter. The authentication transport must call window.open()
 * during the original click handler, so that await causes browsers and the
 * signer SDK to reject the authentication window as non-user-initiated.
 *
 * The transition mutates PNP's state synchronously even though it returns a
 * promise. Starting both operations before awaiting either preserves PNP's
 * normal state lifecycle while keeping window.open() inside the user gesture.
 *
 * @param pnp - The initialized Plug and Play instance used for authentication.
 * @param walletId - The registered wallet adapter identifier to connect.
 * @returns The account returned by the connected wallet adapter.
 * @throws The connection error after PNP transitions to its error state.
 */
export const connectPnpFromUserGesture = (
  pnp: PNP,
  walletId: string,
): Promise<PnpConnectionResult> => {
  const internals = pnp as unknown as PnpUserGestureInternals;

  if (internals.stateManager.getCurrentState() === PnpState.CONNECTED) {
    if (!pnp.account) {
      return Promise.reject(new Error("PNP is connected without an account"));
    }
    return Promise.resolve(pnp.account);
  }

  const connectingTransition = internals.stateManager.transitionTo(
    PnpState.CONNECTING,
  );
  const connection = internals.connectionManager.connect(walletId);

  return Promise.all([connectingTransition, connection])
    .then(([, account]) => account)
    .catch(async (error: unknown) => {
      try {
        await internals.stateManager.transitionTo(PnpState.ERROR, { error });
      } catch {
        // Preserve the connection error if PNP already changed state.
      }
      internals.errorManager.handleError(error);
      throw error;
    });
};
