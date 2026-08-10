import { describe, expect, it, vi } from "vitest";
import { PnpState, type PNP } from "@windoge98/plug-n-play";
import { connectPnpFromUserGesture } from "./connectPnpFromUserGesture";

const account = { owner: "principal", subaccount: null };

const createPnp = () => {
  let resolveConnecting!: () => void;
  const transitionTo = vi.fn((state: PnpState) => {
    if (state === PnpState.CONNECTING) {
      return new Promise<void>((resolve) => {
        resolveConnecting = resolve;
      });
    }
    return Promise.resolve();
  });
  const connect = vi.fn(() => Promise.resolve(account));
  const handleError = vi.fn();
  const pnp = {
    account: null,
    stateManager: {
      getCurrentState: () => PnpState.INITIALIZED,
      transitionTo,
    },
    connectionManager: { connect },
    errorManager: { handleError },
  } as unknown as PNP;

  return {
    pnp,
    connect,
    handleError,
    resolveConnecting: () => resolveConnecting(),
    transitionTo,
  };
};

describe("connectPnpFromUserGesture", () => {
  it("starts the adapter connection before awaiting the state transition", async () => {
    const { pnp, connect, resolveConnecting } = createPnp();

    const result = connectPnpFromUserGesture(pnp, "iiSigner");

    expect(connect).toHaveBeenCalledWith("iiSigner");

    resolveConnecting();

    await expect(result).resolves.toEqual(account);
  });

  it("moves PNP to the error state when the connection fails", async () => {
    const { pnp, connect, handleError, resolveConnecting, transitionTo } =
      createPnp();
    const failure = new Error("Connection failed");
    connect.mockRejectedValueOnce(failure);

    const result = connectPnpFromUserGesture(pnp, "iiSigner");
    resolveConnecting();

    await expect(result).rejects.toBe(failure);
    expect(transitionTo).toHaveBeenLastCalledWith(PnpState.ERROR, {
      error: failure,
    });
    expect(handleError).toHaveBeenCalledWith(failure);
  });
});
