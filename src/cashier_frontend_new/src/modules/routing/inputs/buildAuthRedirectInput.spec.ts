import { beforeEach, describe, expect, it, vi } from "vitest";
import { buildAuthRedirectInput } from "$modules/routing/inputs/buildAuthRedirectInput";

const { mockAuthState, mockUserProfile } = vi.hoisted(() => ({
  mockAuthState: {
    isReady: true,
    account: null as { owner: string } | null,
  },
  mockUserProfile: {
    isLoggedIn: vi.fn(() => false),
  },
}));

vi.mock("$modules/auth/state/auth.svelte", () => ({
  authState: mockAuthState,
}));

vi.mock("$modules/shared/services/userProfile.svelte", () => ({
  userProfile: mockUserProfile,
}));

describe("buildAuthRedirectInput", () => {
  beforeEach(() => {
    mockAuthState.isReady = true;
    mockAuthState.account = null;
    mockUserProfile.isLoggedIn.mockReturnValue(false);
  });

  it("builds logged-out home redirect input", () => {
    const input = buildAuthRedirectInput("/");

    expect(input).toEqual({
      pathname: "/",
      isAuthReady: true,
      isLoading: false,
      currentUserId: null,
      linkId: null,
      linkExists: false,
      linkOwnerId: null,
      linkState: null,
      userState: null,
      linkEnded: false,
    });
  });

  it("builds logged-in link-list redirect input", () => {
    mockAuthState.account = { owner: "owner-principal" };
    mockUserProfile.isLoggedIn.mockReturnValue(true);

    const input = buildAuthRedirectInput("/links");

    expect(input).toEqual({
      pathname: "/links",
      isAuthReady: true,
      isLoading: false,
      currentUserId: "owner-principal",
      linkId: null,
      linkExists: false,
      linkOwnerId: null,
      linkState: null,
      userState: null,
      linkEnded: false,
    });
  });

  it("preserves pending auth state", () => {
    mockAuthState.isReady = false;

    const input = buildAuthRedirectInput("/");

    expect(input).toMatchObject({
      pathname: "/",
      isAuthReady: false,
      isLoading: false,
    });
  });

  it("parses link id when given a URL object", () => {
    const input = buildAuthRedirectInput(
      new URL("http://localhost/link/public-link-1"),
    );

    expect(input).toMatchObject({
      pathname: "/link/public-link-1",
      linkId: "public-link-1",
      linkExists: false,
    });
  });
});
