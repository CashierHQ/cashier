import { ActionType } from "$modules/links/types/action/actionType";
import { LinkType } from "$modules/links/types/link/linkType";
import { describe, expect, it } from "vitest";
import { findUseActionTypeFromLinkType } from "./useActionTypeFromLinkType";

describe("findUseActionTypeFromLinkType", () => {
  it("returns RECEIVE for LinkType.TIP", () => {
    const actionType = findUseActionTypeFromLinkType(LinkType.TIP);
    expect(actionType).toBe(ActionType.RECEIVE);
  });

  it("returns null for unsupported link types", () => {
    const actionType = findUseActionTypeFromLinkType(LinkType.AIRDROP);
    expect(actionType).toBeNull();
  });
});
