import { GuardContext } from "$modules/guard/context.svelte";
import type { LinkCreationStoreV3 } from "$modules/creationLink/state/linkCreationStoreV3.svelte";
import type { LinkDetailStoreV3 } from "$modules/detailLink/state/linkDetailStoreV3.svelte";
import type { UserLinkStoreV3 } from "$modules/useLink/state/userLinkStoreV3.svelte";
import { Principal } from "@icp-sdk/core/principal";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockAuthState, mockUserProfile } = vi.hoisted(() => ({
  mockAuthState: {
    isReady: false,
    isLoggedIn: false,
    account: null as { owner: string } | null,
  },
  mockUserProfile: {
    isLoggedIn: () => false,
  },
}));

vi.mock("$modules/auth/state/auth.svelte", () => ({
  authState: mockAuthState,
}));

vi.mock("$modules/shared/services/userProfile.svelte", () => ({
  userProfile: mockUserProfile,
}));

const OWNER = "xybay-d2owu-tceww-zgxi4-fez55-626yd-knfze-rzeei-k2raw-6bng2-bae";

function makeLink(overrides?: Record<string, unknown>) {
  return {
    id: "link-1",
    creator: Principal.fromText(OWNER),
    ...overrides,
  };
}

describe("GuardContext", () => {
  let context: GuardContext;

  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthState.isReady = false;
    mockAuthState.isLoggedIn = false;
    mockAuthState.account = null;
    mockUserProfile.isLoggedIn = () => false;
    context = new GuardContext();
  });

  it("initializes with V3 store slots empty", () => {
    expect(context.linkDetailStoreV3).toBeNull();
    expect(context.userLinkStoreV3).toBeNull();
    expect(context.linkCreationStoreV3).toBeNull();
    expect(context.isGuardCheckComplete).toBe(false);
    expect(context.hasDraftLinkLoadAttempted).toBe(false);
  });

  it("accepts V3 stores from constructor", () => {
    const detailStore = {
      link: makeLink(),
      query: { isLoading: false },
    } as unknown as LinkDetailStoreV3;
    const userStore = {
      link: makeLink(),
      isLoading: false,
    } as unknown as UserLinkStoreV3;
    const creationStore = {
      draftLink: makeLink(),
    } as unknown as LinkCreationStoreV3;

    const ctx = new GuardContext({
      linkDetailStoreV3: detailStore,
      userLinkStoreV3: userStore,
      linkCreationStoreV3: creationStore,
    });

    expect(ctx.linkDetailStoreV3).toBe(detailStore);
    expect(ctx.userLinkStoreV3).toBe(userStore);
    expect(ctx.linkCreationStoreV3).toBe(creationStore);
  });

  it("sets V3 stores", () => {
    const detailStore = {
      link: makeLink(),
      query: { isLoading: false },
    } as unknown as LinkDetailStoreV3;
    const userStore = {
      link: makeLink(),
      isLoading: false,
    } as unknown as UserLinkStoreV3;
    const creationStore = {
      draftLink: makeLink(),
    } as unknown as LinkCreationStoreV3;

    context.setLinkDetailStoreV3(detailStore);
    context.setUserLinkStoreV3(userStore);
    context.setLinkCreationStoreV3(creationStore);

    expect(context.linkDetailStoreV3).toBe(detailStore);
    expect(context.userLinkStoreV3).toBe(userStore);
    expect(context.linkCreationStoreV3).toBe(creationStore);
  });

  it("returns the first available V3 store and link", () => {
    const detailStore = {
      link: makeLink({ id: "detail-link" }),
      query: { isLoading: false },
    } as unknown as LinkDetailStoreV3;
    const userStore = {
      link: makeLink({ id: "user-link" }),
      isLoading: false,
    } as unknown as UserLinkStoreV3;

    context.setLinkDetailStoreV3(detailStore);
    context.setUserLinkStoreV3(userStore);

    expect(context.getLinkStore()).toBe(detailStore);
    expect(context.getLink()?.id).toBe("detail-link");
  });

  it("reports loading for detail and user V3 stores", () => {
    context.setLinkDetailStoreV3({
      link: undefined,
      query: { isLoading: true },
    } as unknown as LinkDetailStoreV3);
    expect(context.isLoading()).toBe(true);

    context.linkDetailStoreV3 = null;
    context.setUserLinkStoreV3({
      link: undefined,
      isLoading: true,
    } as unknown as UserLinkStoreV3);
    expect(context.isLoading()).toBe(true);
  });

  it("treats V3 creation store as owner", () => {
    context.setLinkCreationStoreV3({
      draftLink: makeLink(),
    } as unknown as LinkCreationStoreV3);
    expect(context.isOwner()).toBe(true);
  });

  it("checks ownership against loaded V3 links", () => {
    mockAuthState.account = { owner: OWNER };
    context.setLinkDetailStoreV3({
      link: makeLink(),
      query: { isLoading: false },
    } as unknown as LinkDetailStoreV3);

    expect(context.isOwner()).toBe(true);

    mockAuthState.account = { owner: "aaaaa-aa" };
    expect(context.isOwner()).toBe(false);
  });

  it("reports whether a V3 link exists", () => {
    expect(context.hasLink()).toBe(false);

    context.setUserLinkStoreV3({
      link: makeLink(),
      isLoading: false,
    } as unknown as UserLinkStoreV3);

    expect(context.hasLink()).toBe(true);
  });
});
