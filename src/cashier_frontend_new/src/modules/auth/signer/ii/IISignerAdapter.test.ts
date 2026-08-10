/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, vi } from "vitest";
import type { Identity } from "@icp-sdk/core/agent";
import { IISignerAdapter } from "$modules/auth/signer/ii/IISignerAdapter";

const authClientMocks = vi.hoisted(() => ({
  getIdentity: vi.fn(),
  isAuthenticated: vi.fn(),
  signIn: vi.fn(),
  signOut: vi.fn(),
}));

vi.mock("@icp-sdk/auth/client", () => ({
  AuthClient: class {
    public isAuthenticated(): boolean {
      return authClientMocks.isAuthenticated();
    }

    public getIdentity(): Promise<Identity> {
      return authClientMocks.getIdentity();
    }

    public signIn(options: { maxTimeToLive: bigint }): Promise<Identity> {
      return authClientMocks.signIn(options);
    }

    public signOut(): Promise<void> {
      return authClientMocks.signOut();
    }
  },
}));

type TestableAdapter = {
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
    authClientMocks.isAuthenticated.mockReturnValue(true);
    authClientMocks.getIdentity.mockResolvedValue(identity);
    authClientMocks.signIn.mockResolvedValue(identity);
    authClientMocks.signOut.mockResolvedValue(undefined);
    const adapter = new IISignerAdapter({
      iiProviderUrl: "https://identity.ic0.app",
      idleOptions: { disableIdle: true },
    });
    const testableAdapter = adapter as unknown as TestableAdapter;
    testableAdapter.initAgentAndSigner = vi.fn().mockResolvedValue(undefined);

    await adapter.connect();
    expect(authClientMocks.signIn).not.toHaveBeenCalled();

    await adapter.renewSession();

    expect(authClientMocks.signIn).toHaveBeenCalledOnce();
    expect(authClientMocks.signIn).toHaveBeenCalledWith({
      maxTimeToLive: BigInt(60 * 60 * 1_000 * 1_000 * 1_000),
    });
  });
});
