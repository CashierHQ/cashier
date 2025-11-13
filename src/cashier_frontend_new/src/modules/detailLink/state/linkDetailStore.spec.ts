import type {
  ActionDto,
  LinkState as BackendLinkState,
  LinkType as BackendLinkType,
  GetLinkResp,
  LinkDto,
} from "$lib/generated/cashier_backend/cashier_backend.did";
import { cashierBackendService } from "$modules/links/services/cashierBackend";
import { ActionType } from "$modules/links/types/action/actionType";
import { Link, LinkMapper } from "$modules/links/types/link/link";
import {
  LinkState,
  type LinkStateValue,
} from "$modules/links/types/link/linkState";
import {
  LinkType,
  type LinkTypeValue,
} from "$modules/links/types/link/linkType";
import { Principal } from "@dfinity/principal";
import { Ok } from "ts-results-es";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { LinkDetailStore } from "./linkDetailStore.svelte";

const mocks = vi.hoisted(() => ({
  cashierBackendService: {
    getLink: vi.fn(),
  },
}));

vi.mock("$modules/links/services/cashierBackend", () => ({
  cashierBackendService: mocks.cashierBackendService,
}));

const makeLink = (
  state: LinkStateValue,
  link_type: LinkTypeValue = LinkType.TIP,
) =>
  new Link(
    "id",
    "title",
    Principal.fromText("aaaaa-aa"),
    [],
    link_type,
    1n,
    state,
    0n,
    0n,
  );

const makeLinkDto = (
  stateBackend: BackendLinkState,
  linkTypeBackend: BackendLinkType,
) => ({
  id: "id",
  title: "title",
  creator: Principal.fromText("aaaaa-aa"),
  asset_info: [],
  link_type: linkTypeBackend,
  create_at: 1n,
  state: stateBackend,
  link_use_action_max_count: 0n,
  link_use_action_counter: 0n,
});

const makeActionDto = (): ActionDto => ({
  id: "a",
  // empty list is valid for the union type [] | [Icrc112Request[][]]
  icrc_112_requests: [] as [],
  creator: Principal.fromText("aaaaa-aa"),
  intents: [],
  type: { Use: null },
  state: { Created: null },
});

beforeEach(() => {
  vi.clearAllMocks();
});

describe("fetchLinkDetail behavior", () => {
  it("should call getLink once when action is provided", async () => {
    // arrange
    const linkInstance = makeLink(LinkState.ACTIVE, LinkType.TIP);
    vi.spyOn(LinkMapper, "fromBackendType").mockReturnValue(linkInstance);
    const linkDto: LinkDto = makeLinkDto({ Active: null }, { SendTip: null });
    const actionDto: ActionDto = makeActionDto();
    const resp1: GetLinkResp = { link: linkDto, action: [actionDto] };
    vi.mocked(cashierBackendService.getLink).mockResolvedValueOnce(Ok(resp1));

    // act
    await LinkDetailStore.fetchLinkDetail("some-id", {
      action: ActionType.SEND,
      anonymous: false,
    });

    // assert
    expect(vi.mocked(cashierBackendService.getLink)).toHaveBeenCalledTimes(1);
    const callArgs = vi.mocked(cashierBackendService.getLink).mock.calls[0];
    // when action provided, getLink called with (id, { action_type })
    expect(callArgs[0]).toBe("some-id");
    expect(callArgs[1]).toBeDefined();
  });

  it("should call getLink twice and first call anonymous=false when logged in", async () => {
    // arrange
    const linkInstance = makeLink(LinkState.ACTIVE, LinkType.TIP);
    vi.spyOn(LinkMapper, "fromBackendType").mockReturnValue(linkInstance);
    // first call returns a link without action (empty array), second call returns action
    const linkDto1: LinkDto = makeLinkDto({ Active: null }, { SendTip: null });
    const actionDto2: ActionDto = makeActionDto();
    const resp2: GetLinkResp = { link: linkDto1, action: [] };
    const resp3: GetLinkResp = { link: linkDto1, action: [actionDto2] };
    vi.mocked(cashierBackendService.getLink).mockResolvedValueOnce(Ok(resp2));
    vi.mocked(cashierBackendService.getLink).mockResolvedValueOnce(Ok(resp3));

    // act
    await LinkDetailStore.fetchLinkDetail("some-id", { anonymous: false });

    // assert
    expect(vi.mocked(cashierBackendService.getLink)).toHaveBeenCalledTimes(2);
    const firstCallArgs = vi.mocked(cashierBackendService.getLink).mock
      .calls[0];
    // first call should include actorOptions { anonymous: false }
    expect(firstCallArgs[2]).toEqual({ anonymous: false });
  });

  it("should call getLink once anonymous=true when not logged in", async () => {
    // arrange
    const linkInstance = makeLink(LinkState.ACTIVE, LinkType.TIP);
    vi.spyOn(LinkMapper, "fromBackendType").mockReturnValue(linkInstance);
    const linkDto3: LinkDto = makeLinkDto({ Active: null }, { SendTip: null });
    const actionDto3: ActionDto = makeActionDto();
    const resp4: GetLinkResp = { link: linkDto3, action: [] };
    const resp5: GetLinkResp = { link: linkDto3, action: [actionDto3] };
    vi.mocked(cashierBackendService.getLink).mockResolvedValueOnce(Ok(resp4));
    vi.mocked(cashierBackendService.getLink).mockResolvedValueOnce(Ok(resp5));

    // act
    await LinkDetailStore.fetchLinkDetail("some-id", { anonymous: true });

    // assert
    expect(vi.mocked(cashierBackendService.getLink)).toHaveBeenCalledTimes(1);
    const firstCallArgs = vi.mocked(cashierBackendService.getLink).mock
      .calls[0];
    // first call should include actorOptions { anonymous: true }
    expect(firstCallArgs[2]).toEqual({ anonymous: true });
  });
});

describe("determineActionTypeFromLink", () => {
  it("returns CreateLink for CREATE_LINK", () => {
    const res = LinkDetailStore.determineActionTypeFromLink(
      makeLink(LinkState.CREATE_LINK),
    );
    expect(res).toEqual(ActionType.CREATE_LINK);
  });

  it("returns Receive for TIP, TOKEN_BASKET and AIRDROP when ACTIVE", () => {
    const types: LinkTypeValue[] = [
      LinkType.TIP,
      LinkType.TOKEN_BASKET,
      LinkType.AIRDROP,
    ];
    types.forEach((t) => {
      const res = LinkDetailStore.determineActionTypeFromLink(
        makeLink(LinkState.ACTIVE, t),
      );
      expect(res).toEqual(ActionType.RECEIVE);
    });
  });

  it("returns Send for RECEIVE_PAYMENT when ACTIVE", () => {
    const res = LinkDetailStore.determineActionTypeFromLink(
      makeLink(LinkState.ACTIVE, LinkType.RECEIVE_PAYMENT),
    );
    expect(res).toEqual(ActionType.SEND);
  });

  it("returns Withdraw for INACTIVE", () => {
    const res = LinkDetailStore.determineActionTypeFromLink(
      makeLink(LinkState.INACTIVE),
    );
    expect(res).toEqual(ActionType.WITHDRAW);
  });
});
