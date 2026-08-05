// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import {
  AuthenticationPopupClosedError,
  detectAuthenticationPopupClose,
} from "./authenticationPopup";

const createPopupHost = (popup: Window | null) => {
  let checkForClose = () => {};
  const host = {
    open: vi.fn(() => popup),
    setInterval: vi.fn((callback: TimerHandler) => {
      checkForClose = callback as () => void;
      return 1;
    }),
    clearInterval: vi.fn(),
    focus: vi.fn(),
  } as unknown as Window;

  return {
    host,
    checkForClose: () => checkForClose(),
  };
};

describe("detectAuthenticationPopupClose", () => {
  it("rejects promptly when the authentication popup is closed", async () => {
    const popup = { closed: false } as Window;
    const { host, checkForClose } = createPopupHost(popup);
    const originalOpen = host.open;
    const authentication = new Promise<never>(() => {});

    const result = detectAuthenticationPopupClose(
      () => {
        host.open("https://id.ai/authorize");
        return authentication;
      },
      250,
      host,
    );

    expect(host.open).toBe(originalOpen);

    Object.defineProperty(popup, "closed", { value: true });
    checkForClose();

    await expect(result).rejects.toBeInstanceOf(AuthenticationPopupClosedError);
    expect(host.clearInterval).toHaveBeenCalledTimes(1);
    expect(host.focus).toHaveBeenCalledTimes(1);
  });

  it("still rejects when the browser refuses to focus the host window", async () => {
    const popup = { closed: false } as Window;
    const { host, checkForClose } = createPopupHost(popup);
    vi.mocked(host.focus).mockImplementation(() => {
      throw new Error("Focus denied");
    });

    const result = detectAuthenticationPopupClose(
      () => {
        host.open("https://id.ai/authorize");
        return new Promise<never>(() => {});
      },
      250,
      host,
    );

    Object.defineProperty(popup, "closed", { value: true });
    checkForClose();

    await expect(result).rejects.toBeInstanceOf(AuthenticationPopupClosedError);
    expect(host.clearInterval).toHaveBeenCalledTimes(1);
  });

  it("resolves normally when authentication completes", async () => {
    const popup = { closed: false } as Window;
    const { host } = createPopupHost(popup);

    const result = await detectAuthenticationPopupClose(
      () => {
        host.open("https://id.ai/authorize");
        return Promise.resolve("identity");
      },
      250,
      host,
    );

    expect(result).toBe("identity");
    expect(host.clearInterval).toHaveBeenCalledTimes(1);
  });

  it("passes through an authentication failure after a popup opens", async () => {
    const popup = { closed: false } as Window;
    const { host } = createPopupHost(popup);
    const failure = new Error("Authentication timed out");

    await expect(
      detectAuthenticationPopupClose(
        () => {
          host.open("https://id.ai/authorize");
          return Promise.reject(failure);
        },
        250,
        host,
      ),
    ).rejects.toBe(failure);

    expect(host.clearInterval).toHaveBeenCalledTimes(1);
  });

  it("passes through a blocked-window authentication failure", async () => {
    const { host } = createPopupHost(null);
    const failure = new Error("Signer window could not be opened");

    await expect(
      detectAuthenticationPopupClose(
        () => {
          host.open("https://id.ai/authorize");
          return Promise.reject(failure);
        },
        250,
        host,
      ),
    ).rejects.toBe(failure);

    expect(host.clearInterval).not.toHaveBeenCalled();
  });

  it("passes through authentication that does not open a popup", async () => {
    const { host } = createPopupHost(null);

    await expect(
      detectAuthenticationPopupClose(
        () => Promise.resolve("identity"),
        250,
        host,
      ),
    ).resolves.toBe("identity");
  });
});
