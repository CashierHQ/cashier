// @vitest-environment jsdom

import { type Link as SharedLink, LinkState, LinkType } from "$shared";
import { Principal } from "@dfinity/principal";
import { beforeEach, describe, expect, it, vi } from "vitest";

const fixture_of_owner = vi.hoisted(
  () => "xybay-d2owu-tceww-zgxi4-fez55-626yd-knfze-rzeei-k2raw-6bng2-bae",
);
const fixture_of_creator = Principal.fromText(fixture_of_owner);
const fixture_of_auth_state = vi.hoisted(() => ({
  account: {
    owner: fixture_of_owner,
  },
}));

vi.mock("$modules/auth/state/auth.svelte", () => ({
  authState: fixture_of_auth_state,
}));

import { draftLinkService } from "./draftLink";

function fixture_of_draft_link(overrides?: Partial<SharedLink>): SharedLink {
  return {
    id: "draft-1",
    title: "Draft Link",
    link_type: LinkType.SendTip,
    link_state: LinkState.ChooseType,
    creator: fixture_of_creator,
    asset_info: [],
    max_use: 1n,
    use_count: 0n,
    created_at: 1n,
    ...overrides,
  };
}

beforeEach(() => {
  localStorage.clear();
});

describe("DraftLinkService", () => {
  it("it_should_do_persist_many_draft_links_without_overwriting_existing_draft_links", () => {
    // Arrange
    const now_spy = vi.spyOn(Date, "now");
    now_spy.mockReturnValueOnce(1_000).mockReturnValueOnce(2_000);

    // Act
    const first_result =
      draftLinkService.createAndPersistDraftLink(fixture_of_creator);
    const second_result =
      draftLinkService.createAndPersistDraftLink(fixture_of_creator);

    // Assert
    expect(first_result.isOk()).toBe(true);
    expect(second_result.isOk()).toBe(true);

    const first_draft_link = first_result.unwrap();
    const second_draft_link = second_result.unwrap();
    const actual = [
      draftLinkService.getDraftLink(first_draft_link.id),
      draftLinkService.getDraftLink(second_draft_link.id),
    ];

    expect(first_draft_link.id).not.toBe(second_draft_link.id);
    expect(actual).toHaveLength(2);
    expect(actual[0]?.id).toBe(first_draft_link.id);
    expect(actual[1]?.id).toBe(second_draft_link.id);

    now_spy.mockRestore();
  });

  it("it_should_do_return_created_draft_link_from_principal_id", () => {
    // Arrange
    const now_spy = vi.spyOn(Date, "now").mockReturnValue(1_000);

    // Act
    const actual =
      draftLinkService.createDraftLinkFromPrincipalId(fixture_of_creator);

    // Assert
    expect(actual.isOk()).toBe(true);
    expect(actual.unwrap()).toEqual(
      fixture_of_draft_link({
        id: `${fixture_of_owner}-1000`,
        title: "New Link",
        created_at: 1_000_000_000n,
      }),
    );

    now_spy.mockRestore();
  });
});
