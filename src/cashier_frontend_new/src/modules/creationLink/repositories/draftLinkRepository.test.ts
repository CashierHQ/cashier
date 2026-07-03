// @vitest-environment jsdom

import { SharedLinkMapper } from "$modules/actionTemplate/types/link";
import type { DraftLink } from "$modules/creationLink/types";
import { LinkStep } from "$modules/links/types/linkStep";
import { DRAFT_LINKS_STORAGE_KEY_PREFIX } from "$modules/shared/constants";
import { LinkState, LinkType } from "$shared";
import { Principal } from "@icp-sdk/core/principal";
import * as devalue from "devalue";
import { beforeEach, describe, expect, it } from "vitest";
import { draftLinkRepository } from "$modules/creationLink/repositories/draftLinkRepository";

const fixture_of_owner = "owner-1";
const fixture_of_another_owner = "owner-2";
const fixture_of_creator = Principal.fromText("aaaaa-aa");

function fixture_of_draft_link(overrides?: Partial<DraftLink>): DraftLink {
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

describe("DraftLinkRepository", () => {
  it("it_should_fail_do_update_due_to_missing_draft_link_id", () => {
    // Arrange
    const fixture_of_existing_draft_link = fixture_of_draft_link({
      id: "draft-existing",
      title: "Existing",
    });
    draftLinkRepository.create({
      id: fixture_of_existing_draft_link.id,
      draftLink: fixture_of_existing_draft_link,
      owner: fixture_of_owner,
    });

    // Act
    draftLinkRepository.update({
      id: "draft-missing",
      owner: fixture_of_owner,
      updateData: {
        title: "Updated Title",
      },
    });

    // Assert
    const actual = draftLinkRepository.get(fixture_of_owner);
    expect(actual).toHaveLength(1);
    expect(actual[0].id).toBe("draft-existing");
    expect(actual[0].title).toBe("Existing");
  });

  it("it_should_do_create_draft_link_on_empty_storage", () => {
    // Arrange
    const fixture_of_new_draft_link = fixture_of_draft_link();

    // Act
    draftLinkRepository.create({
      id: fixture_of_new_draft_link.id,
      draftLink: fixture_of_new_draft_link,
      owner: fixture_of_owner,
    });

    // Assert
    const actual = draftLinkRepository.get(fixture_of_owner);
    expect(actual).toHaveLength(1);
    expect(actual[0].id).toBe(fixture_of_new_draft_link.id);
  });

  it("it_should_do_preserve_existing_draft_links_when_creating_new_draft_link", () => {
    // Arrange
    const fixture_of_first_draft_link = fixture_of_draft_link({
      id: "draft-1",
      title: "First",
    });
    const fixture_of_second_draft_link = fixture_of_draft_link({
      id: "draft-2",
      title: "Second",
      created_at: 2n,
    });
    draftLinkRepository.create({
      id: fixture_of_first_draft_link.id,
      draftLink: fixture_of_first_draft_link,
      owner: fixture_of_owner,
    });

    // Act
    draftLinkRepository.create({
      id: fixture_of_second_draft_link.id,
      draftLink: fixture_of_second_draft_link,
      owner: fixture_of_owner,
    });

    // Assert
    const actual = draftLinkRepository.get(fixture_of_owner);
    expect(actual).toHaveLength(2);
    expect(actual.map((draft) => draft.id)).toEqual(["draft-1", "draft-2"]);
  });

  it("it_should_do_replace_only_matching_draft_link_when_creating_same_id", () => {
    // Arrange
    const fixture_of_original_draft_link = fixture_of_draft_link({
      id: "draft-1",
      title: "Original",
    });
    const fixture_of_sibling_draft_link = fixture_of_draft_link({
      id: "draft-2",
      title: "Sibling",
      created_at: 2n,
    });
    const fixture_of_updated_draft_link = fixture_of_draft_link({
      id: "draft-1",
      title: "Updated",
      created_at: 3n,
    });
    draftLinkRepository.create({
      id: fixture_of_original_draft_link.id,
      draftLink: fixture_of_original_draft_link,
      owner: fixture_of_owner,
    });
    draftLinkRepository.create({
      id: fixture_of_sibling_draft_link.id,
      draftLink: fixture_of_sibling_draft_link,
      owner: fixture_of_owner,
    });

    // Act
    draftLinkRepository.create({
      id: fixture_of_updated_draft_link.id,
      draftLink: fixture_of_updated_draft_link,
      owner: fixture_of_owner,
    });

    // Assert
    const actual = draftLinkRepository.get(fixture_of_owner);
    expect(actual).toHaveLength(2);
    expect(actual.find((draft) => draft.id === "draft-1")?.title).toBe(
      "Updated",
    );
    expect(actual.find((draft) => draft.id === "draft-2")?.title).toBe(
      "Sibling",
    );
  });

  it("it_should_do_isolate_draft_links_by_owner", () => {
    // Arrange
    const fixture_of_first_owner_draft_link = fixture_of_draft_link({
      id: "draft-owner-1",
    });
    const fixture_of_second_owner_draft_link = fixture_of_draft_link({
      id: "draft-owner-2",
    });

    // Act
    draftLinkRepository.create({
      id: fixture_of_first_owner_draft_link.id,
      draftLink: fixture_of_first_owner_draft_link,
      owner: fixture_of_owner,
    });
    draftLinkRepository.create({
      id: fixture_of_second_owner_draft_link.id,
      draftLink: fixture_of_second_owner_draft_link,
      owner: fixture_of_another_owner,
    });

    // Assert
    expect(draftLinkRepository.get(fixture_of_owner)).toHaveLength(1);
    expect(draftLinkRepository.get(fixture_of_another_owner)).toHaveLength(1);
    expect(draftLinkRepository.get(fixture_of_owner)[0].id).toBe(
      "draft-owner-1",
    );
    expect(draftLinkRepository.get(fixture_of_another_owner)[0].id).toBe(
      "draft-owner-2",
    );
  });

  it("it_should_do_update_only_targeted_draft_link_when_many_draft_links_exist", () => {
    // Arrange
    const fixture_of_first_draft_link = fixture_of_draft_link({
      id: "draft-1",
      title: "First",
    });
    const fixture_of_second_draft_link = fixture_of_draft_link({
      id: "draft-2",
      title: "Second",
      created_at: 2n,
    });
    draftLinkRepository.create({
      id: fixture_of_first_draft_link.id,
      draftLink: fixture_of_first_draft_link,
      owner: fixture_of_owner,
    });
    draftLinkRepository.create({
      id: fixture_of_second_draft_link.id,
      draftLink: fixture_of_second_draft_link,
      owner: fixture_of_owner,
    });

    // Act
    draftLinkRepository.update({
      id: "draft-2",
      owner: fixture_of_owner,
      updateData: {
        title: "Second Updated",
      },
    });

    // Assert
    const actual = draftLinkRepository.get(fixture_of_owner);
    expect(actual).toHaveLength(2);
    expect(actual.find((draft) => draft.id === "draft-1")?.title).toBe("First");
    expect(actual.find((draft) => draft.id === "draft-2")?.title).toBe(
      "Second Updated",
    );
  });

  it("it_should_do_preserve_creation_step_when_updating_draft_link", () => {
    // Arrange
    const fixture_of_existing_draft_link = fixture_of_draft_link({
      id: "draft-with-step",
      link_state: LinkState.Preview,
    });
    draftLinkRepository.create({
      id: fixture_of_existing_draft_link.id,
      draftLink: fixture_of_existing_draft_link,
      owner: fixture_of_owner,
    });

    // Act
    draftLinkRepository.update({
      id: "draft-with-step",
      owner: fixture_of_owner,
      updateData: {
        creationStep: LinkStep.PREVIEW,
      },
    });

    // Assert
    const actual = draftLinkRepository.get(fixture_of_owner);
    expect(actual[0].creationStep).toBe(LinkStep.PREVIEW);
  });

  it("it_should_do_restore_creation_step_from_legacy_shared_link_storage", () => {
    // Arrange
    const fixture_of_legacy_preview_link = fixture_of_draft_link({
      id: "legacy-preview",
      link_state: LinkState.Preview,
    });
    localStorage.setItem(
      `${DRAFT_LINKS_STORAGE_KEY_PREFIX}.${fixture_of_owner}`,
      devalue.stringify(
        [fixture_of_legacy_preview_link],
        SharedLinkMapper.serde.serialize,
      ),
    );

    // Act
    const actual = draftLinkRepository.get(fixture_of_owner);

    // Assert
    expect(actual[0].id).toBe("legacy-preview");
    expect(actual[0].creationStep).toBe(LinkStep.PREVIEW);
  });

  it("it_should_do_delete_only_targeted_draft_link_when_many_draft_links_exist", () => {
    // Arrange
    const fixture_of_first_draft_link = fixture_of_draft_link({
      id: "draft-1",
      title: "First",
    });
    const fixture_of_second_draft_link = fixture_of_draft_link({
      id: "draft-2",
      title: "Second",
      created_at: 2n,
    });
    draftLinkRepository.create({
      id: fixture_of_first_draft_link.id,
      draftLink: fixture_of_first_draft_link,
      owner: fixture_of_owner,
    });
    draftLinkRepository.create({
      id: fixture_of_second_draft_link.id,
      draftLink: fixture_of_second_draft_link,
      owner: fixture_of_owner,
    });

    // Act
    draftLinkRepository.delete("draft-1", fixture_of_owner);

    // Assert
    const actual = draftLinkRepository.get(fixture_of_owner);
    expect(actual).toHaveLength(1);
    expect(actual[0].id).toBe("draft-2");
  });
});
