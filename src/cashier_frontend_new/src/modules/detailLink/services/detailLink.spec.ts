import type {
  LinkState_1 as BackendLinkStateV3,
  LinkType_1 as BackendLinkTypeV3,
  Link as BackendSharedLink,
  GetLinkDetailsResponseV3,
  GetLinkResponseV3,
} from "$lib/generated/cashier_backend/cashier_backend.did";
import { cashierBackendService } from "$modules/links/services/cashierBackend";
import { ActionType } from "$modules/links/types/action/actionType";
import {
  LinkState as SharedLinkState,
  LinkType as SharedLinkType,
  type Link as SharedLink,
} from "$shared";
import { Principal } from "@icp-sdk/core/principal";
import { Ok } from "ts-results-es";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { detailLinkService } from "$modules/detailLink/services/detailLink";

const mocks = vi.hoisted(() => ({
  cashierBackendService: {
    getLinkV3: vi.fn(),
    getUserLinkDetailsV3: vi.fn(),
  },
}));

vi.mock("$modules/links/services/cashierBackend", () => ({
  cashierBackendService: mocks.cashierBackendService,
}));

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

describe("fetchLinkDetailV3", () => {
  it("should call getUserLinkDetailsV3 once when actionTypeValue is provided", async () => {
    const linkDto = makeLinkV3Dto({ Active: null }, { SendTip: null });
    const resp: GetLinkDetailsResponseV3 = {
      link: linkDto,
      actions: [],
      icrc112_requests: [],
      gates: [],
    };
    vi.mocked(cashierBackendService.getUserLinkDetailsV3).mockResolvedValueOnce(
      Ok(resp),
    );

    await detailLinkService.fetchLinkDetailV3({
      id: "some-id",
      actionTypeValue: ActionType.SEND,
      anonymous: false,
    });

    expect(
      vi.mocked(cashierBackendService.getUserLinkDetailsV3),
    ).toHaveBeenCalledTimes(1);
    const callArgs = vi.mocked(cashierBackendService.getUserLinkDetailsV3).mock
      .calls[0];
    expect(callArgs[0]).toBe("some-id");
    expect(callArgs[1]).toBeDefined();
  });

  it("should call getUserLinkDetailsV3 twice for active link when authenticated", async () => {
    const linkDto = makeLinkV3Dto({ Active: null }, { SendTip: null });
    const firstResp: GetLinkDetailsResponseV3 = {
      link: linkDto,
      actions: [],
      icrc112_requests: [],
      gates: [],
    };
    const secondResp: GetLinkDetailsResponseV3 = {
      link: linkDto,
      actions: [],
      icrc112_requests: [],
      gates: [],
    };
    vi.mocked(cashierBackendService.getUserLinkDetailsV3).mockResolvedValueOnce(
      Ok(firstResp),
    );
    vi.mocked(cashierBackendService.getUserLinkDetailsV3).mockResolvedValueOnce(
      Ok(secondResp),
    );

    await detailLinkService.fetchLinkDetailV3({
      id: "some-id",
      anonymous: false,
    });

    expect(
      vi.mocked(cashierBackendService.getUserLinkDetailsV3),
    ).toHaveBeenCalledTimes(2);
    const secondCall = vi.mocked(cashierBackendService.getUserLinkDetailsV3)
      .mock.calls[1];
    expect(secondCall[1]).toBeDefined();
  });

  it("should call getLinkV3 once and skip action fetch when anonymous", async () => {
    const linkDto = makeLinkV3Dto({ Active: null }, { SendTip: null });
    const resp: GetLinkResponseV3 = {
      link: linkDto,
      actions: [],
      icrc112_requests: [],
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
