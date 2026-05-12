import type {
  ActionDto,
  LinkState as BackendLinkState,
  LinkState_1 as BackendLinkStateV3,
  LinkType as BackendLinkType,
  LinkType_1 as BackendLinkTypeV3,
  Link as BackendSharedLink,
  GetLinkResp,
  GetLinkResponseV3,
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
import {
  LinkState as SharedLinkState,
  LinkType as SharedLinkType,
  type Link as SharedLink,
} from "$shared";
import { Principal } from "@icp-sdk/core/principal";
import { Ok } from "ts-results-es";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { detailLinkService } from "./detailLink";

const mocks = vi.hoisted(() => ({
  cashierBackendService: {
    getLink: vi.fn(),
    getLinkV3: vi.fn(),
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
  type: { Send: null },
  state: { Created: null },
});

const makeSharedLink = (
  linkState: SharedLink["link_state"],
  linkType: SharedLink["link_type"] = SharedLinkType.SendTip,
): SharedLink => ({
  id: "shared-id",
  title: "shared-title",
  creator: Principal.fromText("aaaaa-aa"),
  asset_info: [],
  link_type: linkType,
  link_state: linkState,
  use_count: 0n,
  max_use: 1n,
});

const makeLinkV3Dto = (
  stateBackend: BackendLinkStateV3,
  linkTypeBackend: BackendLinkTypeV3,
): BackendSharedLink => ({
  id: "id",
  title: "title",
  creator: Principal.fromText("aaaaa-aa"),
  asset_info: [],
  link_type: linkTypeBackend,
  created_at: [],
  use_count: 0n,
  max_use: 1n,
  link_state: stateBackend,
});

beforeEach(() => {
  vi.clearAllMocks();
});

describe("determineActionTypeFromLink", () => {
  it("should return undefined for INACTIVE_ENDED links", () => {
    expect(
      detailLinkService.determineActionTypeFromLink(
        makeLink(LinkState.INACTIVE_ENDED, LinkType.TIP),
      ),
    ).toBeUndefined();
    expect(
      detailLinkService.determineActionTypeFromLink(
        makeLink(LinkState.INACTIVE_ENDED, LinkType.TOKEN_BASKET),
      ),
    ).toBeUndefined();
    expect(
      detailLinkService.determineActionTypeFromLink(
        makeLink(LinkState.INACTIVE_ENDED, LinkType.AIRDROP),
      ),
    ).toBeUndefined();
    expect(
      detailLinkService.determineActionTypeFromLink(
        makeLink(LinkState.INACTIVE_ENDED, LinkType.RECEIVE_PAYMENT),
      ),
    ).toBeUndefined();
  });
});

describe("determineActionTypeFromLinkV3", () => {
  it("should map Created to CREATE_LINK", () => {
    expect(
      detailLinkService.determineActionTypeFromLinkV3(
        makeSharedLink(SharedLinkState.Created),
      ),
    ).toBe(ActionType.CREATE_LINK);
  });

  it("should map Active SendTip/SendAirdrop/SendTokenBasket to RECEIVE", () => {
    expect(
      detailLinkService.determineActionTypeFromLinkV3(
        makeSharedLink(SharedLinkState.Active, SharedLinkType.SendTip),
      ),
    ).toBe(ActionType.RECEIVE);
    expect(
      detailLinkService.determineActionTypeFromLinkV3(
        makeSharedLink(SharedLinkState.Active, SharedLinkType.SendAirdrop),
      ),
    ).toBe(ActionType.RECEIVE);
    expect(
      detailLinkService.determineActionTypeFromLinkV3(
        makeSharedLink(SharedLinkState.Active, SharedLinkType.SendTokenBasket),
      ),
    ).toBe(ActionType.RECEIVE);
  });

  it("should map Active ReceivePayment to SEND", () => {
    expect(
      detailLinkService.determineActionTypeFromLinkV3(
        makeSharedLink(SharedLinkState.Active, SharedLinkType.ReceivePayment),
      ),
    ).toBe(ActionType.SEND);
  });

  it("should map Inactive to WITHDRAW", () => {
    expect(
      detailLinkService.determineActionTypeFromLinkV3(
        makeSharedLink(SharedLinkState.Inactive),
      ),
    ).toBe(ActionType.WITHDRAW);
  });

  it("should return undefined for Ended", () => {
    expect(
      detailLinkService.determineActionTypeFromLinkV3(
        makeSharedLink(SharedLinkState.Ended),
      ),
    ).toBeUndefined();
  });
});

describe("fetchLinkDetail", () => {
  it("should call getLink once for INACTIVE_ENDED links", async () => {
    // arrange
    const linkInstance = makeLink(LinkState.INACTIVE_ENDED, LinkType.TIP);
    vi.spyOn(LinkMapper, "fromBackendType").mockReturnValue(linkInstance);

    const linkDto: LinkDto = makeLinkDto(
      { InactiveEnded: null },
      { SendTip: null },
    );
    const resp: GetLinkResp = {
      link: linkDto,
      action: [],
      link_user_state: {
        link_id: linkDto.id,
        user_id: Principal.fromText("aaaaa-aa"),
        state: [],
      },
    };
    vi.mocked(cashierBackendService.getLink).mockResolvedValueOnce(Ok(resp));

    // act
    await detailLinkService.fetchLinkDetail({
      id: "some-id",
      anonymous: false,
    });

    // assert
    expect(vi.mocked(cashierBackendService.getLink)).toHaveBeenCalledTimes(1);
  });
});

describe("fetchLinkDetailV3", () => {
  it("should call getLinkV3 once when actionTypeValue is provided", async () => {
    const linkDto = makeLinkV3Dto({ Active: null }, { SendTip: null });
    const resp: GetLinkResponseV3 = {
      link: linkDto,
      action: [],
      icrc112_requests: [],
      link_user_state: [],
    };
    vi.mocked(cashierBackendService.getLinkV3).mockResolvedValueOnce(Ok(resp));

    await detailLinkService.fetchLinkDetailV3({
      id: "some-id",
      actionTypeValue: ActionType.SEND,
      anonymous: false,
    });

    expect(vi.mocked(cashierBackendService.getLinkV3)).toHaveBeenCalledTimes(1);
    const callArgs = vi.mocked(cashierBackendService.getLinkV3).mock.calls[0];
    expect(callArgs[0]).toBe("some-id");
    expect(callArgs[1]).toBeDefined();
    expect(callArgs[2]).toBe(false);
  });

  it("should call getLinkV3 twice for active link when authenticated", async () => {
    const linkDto = makeLinkV3Dto({ Active: null }, { SendTip: null });
    const firstResp: GetLinkResponseV3 = {
      link: linkDto,
      action: [],
      icrc112_requests: [],
      link_user_state: [],
    };
    const secondResp: GetLinkResponseV3 = {
      link: linkDto,
      action: [],
      icrc112_requests: [],
      link_user_state: [],
    };
    vi.mocked(cashierBackendService.getLinkV3).mockResolvedValueOnce(
      Ok(firstResp),
    );
    vi.mocked(cashierBackendService.getLinkV3).mockResolvedValueOnce(
      Ok(secondResp),
    );

    await detailLinkService.fetchLinkDetailV3({
      id: "some-id",
      anonymous: false,
    });

    expect(vi.mocked(cashierBackendService.getLinkV3)).toHaveBeenCalledTimes(2);
    const firstCall = vi.mocked(cashierBackendService.getLinkV3).mock.calls[0];
    const secondCall = vi.mocked(cashierBackendService.getLinkV3).mock.calls[1];
    expect(firstCall[2]).toBe(false);
    expect(secondCall[1]).toBeDefined();
  });

  it("should call getLinkV3 once and skip action fetch when anonymous", async () => {
    const linkDto = makeLinkV3Dto({ Active: null }, { SendTip: null });
    const resp: GetLinkResponseV3 = {
      link: linkDto,
      action: [],
      icrc112_requests: [],
      link_user_state: [],
    };
    vi.mocked(cashierBackendService.getLinkV3).mockResolvedValueOnce(Ok(resp));

    const result = await detailLinkService.fetchLinkDetailV3({
      id: "some-id",
      anonymous: true,
    });

    expect(result.isOk()).toBe(true);
    expect(result.isOk() && result.value.link.id).toBe("id");
    expect(result.isOk() && result.value.link.link_state).toBe(
      SharedLinkState.Active,
    );
    expect(vi.mocked(cashierBackendService.getLinkV3)).toHaveBeenCalledTimes(1);
    const firstCall = vi.mocked(cashierBackendService.getLinkV3).mock.calls[0];
    expect(firstCall[2]).toBe(true);
  });
});

describe("fetchLinkDetail behavior", () => {
  it("should call getLink once when action is provided", async () => {
    // arrange
    const linkInstance = makeLink(LinkState.ACTIVE, LinkType.TIP);
    vi.spyOn(LinkMapper, "fromBackendType").mockReturnValue(linkInstance);
    const linkDto: LinkDto = makeLinkDto({ Active: null }, { SendTip: null });
    const actionDto: ActionDto = makeActionDto();
    const resp1: GetLinkResp = {
      link: linkDto,
      action: [actionDto],
      link_user_state: {
        link_id: linkDto.id,
        user_id: Principal.fromText("aaaaa-aa"),
        state: [],
      },
    };
    vi.mocked(cashierBackendService.getLink).mockResolvedValueOnce(Ok(resp1));

    // act
    await detailLinkService.fetchLinkDetail({
      id: "some-id",
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
    const resp2: GetLinkResp = {
      link: linkDto1,
      action: [],
      link_user_state: {
        link_id: linkDto1.id,
        user_id: Principal.fromText("aaaaa-aa"),
        state: [],
      },
    };
    const resp3: GetLinkResp = {
      link: linkDto1,
      action: [actionDto2],
      link_user_state: {
        link_id: linkDto1.id,
        user_id: Principal.fromText("aaaaa-aa"),
        state: [],
      },
    };
    vi.mocked(cashierBackendService.getLink).mockResolvedValueOnce(Ok(resp2));
    vi.mocked(cashierBackendService.getLink).mockResolvedValueOnce(Ok(resp3));

    // act
    await detailLinkService.fetchLinkDetail({
      id: "some-id",
      anonymous: false,
    });

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
    const resp4: GetLinkResp = {
      link: linkDto3,
      action: [],
      link_user_state: {
        link_id: linkDto3.id,
        user_id: Principal.fromText("aaaaa-aa"),
        state: [],
      },
    };
    const resp5: GetLinkResp = {
      link: linkDto3,
      action: [actionDto3],
      link_user_state: {
        link_id: linkDto3.id,
        user_id: Principal.fromText("aaaaa-aa"),
        state: [],
      },
    };
    vi.mocked(cashierBackendService.getLink).mockResolvedValueOnce(Ok(resp4));
    vi.mocked(cashierBackendService.getLink).mockResolvedValueOnce(Ok(resp5));

    // act
    await detailLinkService.fetchLinkDetail({ id: "some-id", anonymous: true });

    // assert
    expect(vi.mocked(cashierBackendService.getLink)).toHaveBeenCalledTimes(1);
    const firstCallArgs = vi.mocked(cashierBackendService.getLink).mock
      .calls[0];
    // first call should include actorOptions { anonymous: true }
    expect(firstCallArgs[2]).toEqual({ anonymous: true });
  });
});
