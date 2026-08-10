/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, vi } from "vitest";
import type { Identity } from "@icp-sdk/core/agent";
import { IISignerAdapter } from "$modules/auth/signer/ii/IISignerAdapter";

vi.mock("@icp-sdk/auth/client", () => ({
  AuthClient: class {
    public isAuthenticated(): boolean {
      return false;
    }

    public async signOut(): Promise<void> {
      return Promise.resolve();
    }
  },
}));

type TestAuthClient = {
  isAuthenticated: () => boolean;
  getIdentity: () => Promise<Identity>;
  signIn: (options: { maxTimeToLive: bigint }) => Promise<Identity>;
};

type TestableAdapter = {
  authClient: TestAuthClient;
  initAgentAndSigner: (identity: Identity) => Promise<void>;
};

describe("IISignerAdapter renewal", () => {
  it("requests a fresh delegation even when already authenticated", async () => {
    const principal = {
      isAnonymous: () => false,
      toText: () => "aaaaa-aa",
    };
    const identity = {
      getPrincipal: () => principal,
    } as unknown as Identity;
    const signIn = vi.fn().mockResolvedValue(identity);
    const adapter = new IISignerAdapter({
      iiProviderUrl: "https://identity.ic0.app",
      idleOptions: { disableIdle: true },
    });
    const testableAdapter = adapter as unknown as TestableAdapter;
    testableAdapter.authClient = {
      isAuthenticated: () => true,
      getIdentity: async () => identity,
      signIn,
    };
    testableAdapter.initAgentAndSigner = vi.fn().mockResolvedValue(undefined);

    await adapter.connect();
    expect(signIn).not.toHaveBeenCalled();

    await adapter.renewSession();

    expect(signIn).toHaveBeenCalledOnce();
    expect(signIn).toHaveBeenCalledWith({
      maxTimeToLive: BigInt(60 * 60 * 1_000 * 1_000 * 1_000),
    });
  });
});
