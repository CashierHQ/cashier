// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor } from "@testing-library/svelte";
import { beforeEach, describe, expect, it, vi } from "vitest";
import LoginModal from "./LoginModal.svelte";
import { II_SIGNER_WALLET_ID } from "$modules/shared/constants";
import { authState } from "$modules/auth/state/auth.svelte";
import { AuthenticationPopupClosedError } from "$modules/auth/signer/ii/authenticationPopup";

const loginMock = vi.hoisted(() => vi.fn());
const toastMock = vi.hoisted(() => ({
  success: vi.fn(),
  error: vi.fn(),
}));

vi.mock("$modules/auth/state/auth.svelte", () => ({
  authState: {
    login: loginMock,
  },
}));

vi.mock("$lib/i18n", () => ({
  locale: {
    t: (key: string) => {
      const translations: Record<string, string> = {
        "home.loginModal.title": "Connect your wallet",
        "home.loginModal.connecting": "Connecting...",
        "home.loginModal.signInWithGoogle": "Sign in with Google",
        "home.loginModal.signInWithApple": "Sign in with Apple",
        "home.loginModal.signInWithMicrosoft": "Sign in with Microsoft",
        "home.loginModal.internetIdentity": "Internet Identity",
        "home.loginModal.poweredByIdAi": "via id.ai",
        "home.loginModal.otherWallets": "Other wallets",
        "home.loginModal.successMessage": "Successfully logged in",
        "home.loginModal.errorMessage": "Failed to connect wallet.",
        "home.loginModal.regionDisclaimer": "Region disclaimer",
      };

      return translations[key] ?? key;
    },
  },
}));

vi.mock("svelte-sonner", () => ({
  toast: toastMock,
}));

describe("LoginModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    loginMock.mockResolvedValue(undefined);
  });

  it("always renders exactly the four supported login options", () => {
    render(LoginModal, {
      props: {
        open: true,
        onOpenChange: vi.fn(),
      },
    });

    expect(
      screen.getByRole("button", { name: /sign in with google/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /sign in with apple/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /sign in with microsoft/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /internet identity/i }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /other wallets/i }),
    ).not.toBeInTheDocument();
  });

  it.each([
    ["Google", "google"],
    ["Apple", "apple"],
    ["Microsoft", "microsoft"],
  ])(
    "starts Internet Identity login with %s as the OpenID provider",
    async (label, provider) => {
      const onOpenChange = vi.fn();

      render(LoginModal, {
        props: {
          open: true,
          onOpenChange,
        },
      });

      await fireEvent.click(
        screen.getByRole("button", {
          name: new RegExp(`sign in with ${label}`, "i"),
        }),
      );

      await waitFor(() => {
        expect(authState.login).toHaveBeenCalledWith(II_SIGNER_WALLET_ID, {
          openIdProvider: provider,
        });
      });

      expect(onOpenChange).toHaveBeenCalledWith(false);
      expect(toastMock.success).toHaveBeenCalledWith("Successfully logged in");
    },
  );

  it("starts direct Internet Identity login", async () => {
    const onOpenChange = vi.fn();

    render(LoginModal, {
      props: {
        open: true,
        onOpenChange,
      },
    });

    await fireEvent.click(
      screen.getByRole("button", { name: /internet identity/i }),
    );

    await waitFor(() => {
      expect(authState.login).toHaveBeenCalledWith(II_SIGNER_WALLET_ID, {
        openIdProvider: undefined,
      });
    });

    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("keeps the route and blocks duplicate attempts while authentication is pending", async () => {
    const onOpenChange = vi.fn();
    let resolveLogin!: () => void;
    loginMock.mockReturnValueOnce(
      new Promise<void>((resolve) => {
        resolveLogin = resolve;
      }),
    );

    render(LoginModal, {
      props: {
        open: true,
        onOpenChange,
      },
    });

    const originalRoute = window.location.href;
    const googleButton = screen.getByRole("button", {
      name: /sign in with google/i,
    });
    const appleButton = screen.getByRole("button", {
      name: /sign in with apple/i,
    });
    const microsoftButton = screen.getByRole("button", {
      name: /sign in with microsoft/i,
    });
    const internetIdentityButton = screen.getByRole("button", {
      name: /internet identity/i,
    });

    await fireEvent.click(googleButton);

    await waitFor(() => {
      expect(screen.getByText("Connecting...")).toBeInTheDocument();
      expect(googleButton).toBeDisabled();
      expect(appleButton).toBeDisabled();
      expect(microsoftButton).toBeDisabled();
      expect(internetIdentityButton).toBeDisabled();
    });

    await fireEvent.click(appleButton);

    expect(loginMock).toHaveBeenCalledTimes(1);
    expect(window.location.href).toBe(originalRoute);
    expect(onOpenChange).not.toHaveBeenCalled();

    resolveLogin();

    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
  });

  it.each(["Google", "Apple", "Microsoft"])(
    "returns %s to the idle state when the authentication popup is closed",
    async (label) => {
      loginMock.mockRejectedValueOnce(new AuthenticationPopupClosedError());

      render(LoginModal, {
        props: {
          open: true,
          onOpenChange: vi.fn(),
        },
      });

      const providerButton = screen.getByRole("button", {
        name: new RegExp(`sign in with ${label}`, "i"),
      });
      await fireEvent.click(providerButton);

      await waitFor(() => expect(providerButton).toBeEnabled());

      expect(screen.queryByText("Connecting...")).not.toBeInTheDocument();
      expect(toastMock.error).not.toHaveBeenCalled();
    },
  );

  it.each(["Google", "Apple", "Microsoft"])(
    "allows retrying %s after authentication fails",
    async (label) => {
      const onOpenChange = vi.fn();
      const consoleError = vi
        .spyOn(console, "error")
        .mockImplementation(() => undefined);
      loginMock
        .mockRejectedValueOnce(new Error("Authentication failed"))
        .mockResolvedValueOnce(undefined);

      render(LoginModal, {
        props: {
          open: true,
          onOpenChange,
        },
      });

      const providerButton = screen.getByRole("button", {
        name: new RegExp(`sign in with ${label}`, "i"),
      });
      await fireEvent.click(providerButton);

      await waitFor(() => {
        expect(providerButton).toBeEnabled();
        expect(toastMock.error).toHaveBeenCalledWith(
          "Failed to connect wallet.",
        );
      });
      expect(onOpenChange).not.toHaveBeenCalled();

      await fireEvent.click(providerButton);

      await waitFor(() => {
        expect(loginMock).toHaveBeenCalledTimes(2);
        expect(onOpenChange).toHaveBeenCalledWith(false);
      });
      expect(toastMock.success).toHaveBeenCalledWith("Successfully logged in");
      consoleError.mockRestore();
    },
  );
});
