// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor } from "@testing-library/svelte";
import { beforeEach, describe, expect, it, vi } from "vitest";
import LoginModal from "./LoginModal.svelte";
import { II_SIGNER_WALLET_ID } from "$modules/shared/constants";
import { authState } from "$modules/auth/state/auth.svelte";

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
});
