import { describe, it, expect, vi, beforeEach } from "vitest";
import { determineActionTypeFromLink } from "./linkDetailStore.svelte";
import { ActionType } from "../types/action/actionType";
import { LinkState } from "../types/link/linkState";
import { LinkType } from "../types/link/linkType";
import { fetchLinkDetail } from "./linkDetailStore.svelte";
import { cashierBackendService } from "../services/cashierBackend";
import { Ok } from "ts-results-es";
import type {
  GetLinkResp,
  ActionDto,
  LinkDto,
  LinkState as BackendLinkState,
  LinkType as BackendLinkType,
} from "$lib/generated/cashier_backend/cashier_backend.did";
import { Link } from "../types/link/link";
import { Principal } from "@dfinity/principal";

const mocks = vi.hoisted(() => ({
  cashierBackendService: {
    getLink: vi.fn(),
  },
}));

vi.mock("../services/cashierBackend", () => ({
  cashierBackendService: mocks.cashierBackendService,
}));

const makeLink = (state: LinkState, link_type: LinkType = LinkType.TIP) =>
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
    vi.spyOn(Link, "fromBackend").mockReturnValue(linkInstance);
    const linkDto: LinkDto = makeLinkDto({ Active: null }, { SendTip: null });
    const actionDto: ActionDto = makeActionDto();
    const resp1: GetLinkResp = { link: linkDto, action: [actionDto] };
    vi.mocked(cashierBackendService.getLink).mockResolvedValueOnce(Ok(resp1));

    // act
    await fetchLinkDetail("some-id", {
      action: ActionType.Send,
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
    vi.spyOn(Link, "fromBackend").mockReturnValue(linkInstance);
    // first call returns a link without action (empty array), second call returns action
    const linkDto1: LinkDto = makeLinkDto({ Active: null }, { SendTip: null });
    const actionDto2: ActionDto = makeActionDto();
    const resp2: GetLinkResp = { link: linkDto1, action: [] };
    const resp3: GetLinkResp = { link: linkDto1, action: [actionDto2] };
    vi.mocked(cashierBackendService.getLink).mockResolvedValueOnce(Ok(resp2));
    vi.mocked(cashierBackendService.getLink).mockResolvedValueOnce(Ok(resp3));

    // act
    await fetchLinkDetail("some-id", { anonymous: false });

    // assert
    expect(vi.mocked(cashierBackendService.getLink)).toHaveBeenCalledTimes(2);
    const firstCallArgs = vi.mocked(cashierBackendService.getLink).mock
      .calls[0];
    // first call should include actorOptions { anonymous: false }
    expect(firstCallArgs[2]).toEqual({ anonymous: false });
  });

  it("should call getLink twice and first call anonymous=true when not logged in", async () => {
    // arrange
    const linkInstance = makeLink(LinkState.ACTIVE, LinkType.TIP);
    vi.spyOn(Link, "fromBackend").mockReturnValue(linkInstance);
    const linkDto3: LinkDto = makeLinkDto({ Active: null }, { SendTip: null });
    const actionDto3: ActionDto = makeActionDto();
    const resp4: GetLinkResp = { link: linkDto3, action: [] };
    const resp5: GetLinkResp = { link: linkDto3, action: [actionDto3] };
    vi.mocked(cashierBackendService.getLink).mockResolvedValueOnce(Ok(resp4));
    vi.mocked(cashierBackendService.getLink).mockResolvedValueOnce(Ok(resp5));

    // act
    await fetchLinkDetail("some-id", { anonymous: true });

    // assert
    expect(vi.mocked(cashierBackendService.getLink)).toHaveBeenCalledTimes(2);
    const firstCallArgs = vi.mocked(cashierBackendService.getLink).mock
      .calls[0];
    // first call should include actorOptions { anonymous: true }
    expect(firstCallArgs[2]).toEqual({ anonymous: true });
  });
});

describe("determineActionTypeFromLink", () => {
  it("returns CreateLink for CREATE_LINK", () => {
    const res = determineActionTypeFromLink(makeLink(LinkState.CREATE_LINK));
    expect(res).toEqual(ActionType.CreateLink);
  });

  it("returns Receive for TIP, TOKEN_BASKET and AIRDROP when ACTIVE", () => {
    const types = [LinkType.TIP, LinkType.TOKEN_BASKET, LinkType.AIRDROP];
    types.forEach((t) => {
      const res = determineActionTypeFromLink(makeLink(LinkState.ACTIVE, t));
      expect(res).toEqual(ActionType.Receive);
    });
  });

  it("returns Send for RECEIVE_PAYMENT when ACTIVE", () => {
    const res = determineActionTypeFromLink(
      makeLink(LinkState.ACTIVE, LinkType.RECEIVE_PAYMENT),
    );
    expect(res).toEqual(ActionType.Send);
  });

  it("returns Withdraw for INACTIVE", () => {
    const res = determineActionTypeFromLink(makeLink(LinkState.INACTIVE));
    expect(res).toEqual(ActionType.Withdraw);
  });

  it("returns undefined for unknown state", () => {
    const unknownState = "SOME_UNKNOWN_STATE" as unknown as LinkState;
    const res = determineActionTypeFromLink(makeLink(unknownState));
    expect(res).toBeUndefined();
  });
});
