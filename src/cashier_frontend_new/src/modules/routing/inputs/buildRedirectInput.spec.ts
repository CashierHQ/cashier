import { describe, expect, it } from "vitest";
import { LinkState as LegacyLinkState } from "$modules/links/types/link/linkState";
import { LinkStep } from "$modules/links/types/linkStep";
import { UserLinkStep } from "$modules/links/types/userLinkStep";
import { buildRedirectInput } from "$modules/routing/inputs/buildRedirectInput";
import type { RouteContext } from "$modules/routing/state/routeContext.svelte";

const ownerId = "owner-principal";
const otherUserId = "other-principal";

type ContextOptions = {
  isAuthReady?: boolean;
  isLoggedIn?: boolean;
  currentUserId?: string | null;
  isLoading?: boolean;
  linkExists?: boolean;
  link?: unknown;
  linkCreationStoreV3?: unknown;
  linkDetailStoreV3?: unknown;
  userLinkStoreV3?: unknown;
};

function createContext({
  isAuthReady = true,
  isLoggedIn = true,
  currentUserId = ownerId,
  isLoading = false,
  linkExists = false,
  link = null,
  linkCreationStoreV3 = null,
  linkDetailStoreV3 = null,
  userLinkStoreV3 = null,
}: ContextOptions = {}): RouteContext {
  return {
    authState: {
      isReady: isAuthReady,
      account: currentUserId ? { owner: currentUserId } : null,
    },
    userProfile: {
      isLoggedIn: () => isLoggedIn,
    },
    linkCreationStoreV3,
    linkDetailStoreV3,
    userLinkStoreV3,
    isLoading: () => isLoading,
    hasLink: () => linkExists,
    getLink: () => link,
  } as unknown as RouteContext;
}

describe("buildRedirectInput", () => {
  it("builds logged-out home input from a string location", () => {
    const input = buildRedirectInput(
      createContext({
        isLoggedIn: false,
        currentUserId: null,
      }),
      "/",
    );

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

  it("uses create route stores to derive owner link state and owner id", () => {
    const input = buildRedirectInput(
      createContext({
        linkExists: true,
        linkCreationStoreV3: {
          state: { step: LinkStep.ADD_ASSET },
        },
      }),
      "/link/create/draft-link-1",
    );

    expect(input).toMatchObject({
      pathname: "/link/create/draft-link-1",
      currentUserId: ownerId,
      linkId: "draft-link-1",
      linkExists: true,
      linkOwnerId: ownerId,
      linkState: LinkStep.ADD_ASSET,
      userState: null,
      linkEnded: false,
    });
  });

  it("reads owner id and state from a loaded detail route link", () => {
    const input = buildRedirectInput(
      createContext({
        currentUserId: otherUserId,
        linkExists: true,
        link: {
          creator: { toString: () => ownerId },
        },
        linkDetailStoreV3: {
          state: { step: LinkStep.ACTIVE },
        },
      }),
      "/link/detail/backend-link-1",
    );

    expect(input).toMatchObject({
      pathname: "/link/detail/backend-link-1",
      currentUserId: otherUserId,
      linkId: "backend-link-1",
      linkExists: true,
      linkOwnerId: ownerId,
      linkState: LinkStep.ACTIVE,
      linkEnded: false,
    });
  });

  it("prefers draft create state when both draft and detail stores are present", () => {
    const input = buildRedirectInput(
      createContext({
        linkExists: true,
        link: {
          creator: { toString: () => ownerId },
        },
        linkCreationStoreV3: {
          state: { step: LinkStep.PREVIEW },
        },
        linkDetailStoreV3: {
          state: { step: LinkStep.ACTIVE },
        },
      }),
      "/link/detail/draft-link-1",
    );

    expect(input).toMatchObject({
      pathname: "/link/detail/draft-link-1",
      linkId: "draft-link-1",
      linkOwnerId: ownerId,
      linkState: LinkStep.PREVIEW,
    });
  });

  it("reads user state from a public user route store", () => {
    const input = buildRedirectInput(
      createContext({
        linkExists: true,
        link: {
          creator: ownerId,
        },
        userLinkStoreV3: {
          step: UserLinkStep.GATE,
        },
      }),
      new URL("http://localhost/link/public-link-1/use"),
    );

    expect(input).toMatchObject({
      pathname: "/link/public-link-1/use",
      linkId: "public-link-1",
      linkExists: true,
      linkOwnerId: ownerId,
      linkState: null,
      userState: UserLinkStep.GATE,
      linkEnded: false,
    });
  });

  it("marks links as ended when usage reaches the max use count", () => {
    const input = buildRedirectInput(
      createContext({
        linkExists: true,
        link: {
          creator: ownerId,
          link_use_action_counter: 3n,
          link_use_action_max_count: 3n,
        },
        userLinkStoreV3: {
          step: UserLinkStep.LANDING,
        },
      }),
      "/link/public-link-1",
    );

    expect(input.linkEnded).toBe(true);
  });

  it("marks legacy inactive and inactive-ended links as ended", () => {
    const inactiveInput = buildRedirectInput(
      createContext({
        linkExists: true,
        link: {
          creator: ownerId,
          state: LegacyLinkState.INACTIVE,
        },
      }),
      "/link/legacy-inactive-link",
    );
    const inactiveEndedInput = buildRedirectInput(
      createContext({
        linkExists: true,
        link: {
          creator: ownerId,
          state: LegacyLinkState.INACTIVE_ENDED,
        },
      }),
      "/link/legacy-ended-link",
    );

    expect(inactiveInput.linkEnded).toBe(true);
    expect(inactiveEndedInput.linkEnded).toBe(true);
  });

  it("preserves pending auth and route loading flags", () => {
    const input = buildRedirectInput(
      createContext({
        isAuthReady: false,
        isLoading: true,
      }),
      "/links",
    );

    expect(input).toMatchObject({
      pathname: "/links",
      isAuthReady: false,
      isLoading: true,
    });
  });
});
