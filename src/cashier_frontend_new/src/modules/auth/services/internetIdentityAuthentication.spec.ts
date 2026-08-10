import { describe, expect, it, vi } from "vitest";
import { AuthenticationPopupClosedError } from "$modules/auth/signer/ii/authenticationPopup";
import { authenticateWithInternetIdentity } from "$modules/auth/services/internetIdentityAuthentication";

describe("authenticateWithInternetIdentity", () => {
  it.each(["google", "apple", "microsoft"] as const)(
    "passes %s to the Internet Identity connection",
    async (provider) => {
      const connect = vi.fn().mockResolvedValue(undefined);

      await expect(
        authenticateWithInternetIdentity(provider, connect),
      ).resolves.toEqual({ status: "authenticated" });
      expect(connect).toHaveBeenCalledWith(provider);
    },
  );

  it("uses direct Internet Identity when selected", async () => {
    const connect = vi.fn().mockResolvedValue(undefined);

    await expect(
      authenticateWithInternetIdentity("internetIdentity", connect),
    ).resolves.toEqual({ status: "authenticated" });
    expect(connect).toHaveBeenCalledWith(undefined);
  });

  it("returns cancellation when the authentication tab is closed", async () => {
    const connect = vi
      .fn()
      .mockRejectedValue(new AuthenticationPopupClosedError());

    await expect(
      authenticateWithInternetIdentity("google", connect),
    ).resolves.toEqual({ status: "cancelled" });
  });

  it("passes through unexpected authentication failures", async () => {
    const failure = new Error("Authentication failed");
    const connect = vi.fn().mockRejectedValue(failure);

    await expect(
      authenticateWithInternetIdentity("google", connect),
    ).rejects.toBe(failure);
  });
});
