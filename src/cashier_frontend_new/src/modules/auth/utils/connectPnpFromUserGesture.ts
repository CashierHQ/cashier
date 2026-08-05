import { PnpState, type PNP } from "@windoge98/plug-n-play";

type PnpConnectionResult = Awaited<ReturnType<PNP["connect"]>>;

type PnpUserGestureInternals = {
  stateManager: {
    getCurrentState: () => PnpState;
    transitionTo: (
      state: PnpState,
      context?: { error: unknown },
    ) => Promise<void>;
  };
  connectionManager: {
    connect: (walletId: string) => Promise<PnpConnectionResult>;
  };
  errorManager: {
    handleError: (error: unknown) => void;
  };
};

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
