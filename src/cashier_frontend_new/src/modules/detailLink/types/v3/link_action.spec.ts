import { beforeEach, describe, expect, it, vi } from "vitest";
import { LinkActionV3Mapper } from "$modules/detailLink/types/v3/link_action";

const mocks = vi.hoisted(() => ({
  toLocalTypeAction: vi.fn(),
  toLocalTypeLink: vi.fn(),
  fromBackendTypeIcrc112: vi.fn(),
}));

vi.mock("$modules/actionTemplate/types/action", () => ({
  SharedActionMapper: { toLocalType: mocks.toLocalTypeAction },
}));

vi.mock("$modules/actionTemplate/types/link", () => ({
  SharedLinkMapper: { toLocalType: mocks.toLocalTypeLink },
}));

vi.mock("$modules/icrc112/types/icrc112Request", () => ({
  Icrc112RequestMapper: { fromBackendType: mocks.fromBackendTypeIcrc112 },
}));

describe("LinkActionV3Mapper", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.toLocalTypeLink.mockImplementation((link) => link);
    mocks.toLocalTypeAction.mockImplementation((action) => action);
    mocks.fromBackendTypeIcrc112.mockImplementation((req) => req);
  });

  describe("fromBackendResponse", () => {
    it("it_should_map_an_empty_actions_array_when_the_user_has_no_claims", () => {
      const response = {
        link: { id: "link-1" },
        actions: [],
        icrc112_requests: [],
      } as never;

      const result = LinkActionV3Mapper.fromBackendResponse(response);

      expect(result.actions).toEqual([]);
      expect(mocks.toLocalTypeAction).not.toHaveBeenCalled();
    });

    it("it_should_map_all_actions_when_the_user_has_multiple_claims", () => {
      const backendAction1 = { id: "action-1" };
      const backendAction2 = { id: "action-2" };
      const response = {
        link: { id: "link-1" },
        actions: [backendAction1, backendAction2],
        icrc112_requests: [],
      } as never;

      const result = LinkActionV3Mapper.fromBackendResponse(response);

      expect(result.actions).toEqual([backendAction1, backendAction2]);
      expect(mocks.toLocalTypeAction).toHaveBeenCalledTimes(2);
      expect(mocks.toLocalTypeAction).toHaveBeenNthCalledWith(
        1,
        backendAction1,
      );
      expect(mocks.toLocalTypeAction).toHaveBeenNthCalledWith(
        2,
        backendAction2,
      );
    });

    it("it_should_map_icrc112_requests_when_present", () => {
      const backendReq = { method: "m", canister_id: "c", arg: [], nonce: [] };
      const response = {
        link: { id: "link-1" },
        actions: [],
        icrc112_requests: [[[backendReq]]],
      } as never;

      const result = LinkActionV3Mapper.fromBackendResponse(response);

      expect(result.icrc112_requests).toEqual([[backendReq]]);
    });

    it("it_should_leave_icrc112_requests_undefined_when_absent", () => {
      const response = {
        link: { id: "link-1" },
        actions: [],
        icrc112_requests: [],
      } as never;

      const result = LinkActionV3Mapper.fromBackendResponse(response);

      expect(result.icrc112_requests).toBeUndefined();
    });
  });

  describe("fromBackendGetLinkDetailsResponseV3", () => {
    it("it_should_include_gates_alongside_all_mapped_actions", () => {
      const backendAction = { id: "action-1" };
      const gates = [{ gate: { id: "gate-1" } }];
      const response = {
        link: { id: "link-1" },
        actions: [backendAction],
        icrc112_requests: [],
        gates,
      } as never;

      const result =
        LinkActionV3Mapper.fromBackendGetLinkDetailsResponseV3(response);

      expect(result.actions).toEqual([backendAction]);
      expect(result.gates).toBe(gates);
    });
  });
});
