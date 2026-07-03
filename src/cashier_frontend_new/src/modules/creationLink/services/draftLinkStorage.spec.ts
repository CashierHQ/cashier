import { Principal } from "@icp-sdk/core/principal";
import { describe, expect, it } from "vitest";
import type {
  DraftLink,
  DraftLinkStorageRecord,
} from "$modules/creationLink/types";
import {
  deriveCreationStepFromLinkState,
  isDraftLinkStorageRecord,
  toDraftLink,
  toDraftLinkStorageRecord,
} from "$modules/creationLink/services/draftLinkStorage";
import { LinkStep } from "$modules/links/types/linkStep";
import {
  LinkState as SharedLinkState,
  LinkType as SharedLinkType,
  type Link as SharedLink,
} from "$shared";

const CREATOR = Principal.fromText(
  "xybay-d2owu-tceww-zgxi4-fez55-626yd-knfze-rzeei-k2raw-6bng2-bae",
);

function makeSharedLink(overrides?: Partial<SharedLink>): SharedLink {
  return {
    id: "test-link-id",
    title: "Test link",
    link_type: SharedLinkType.SendTip,
    link_state: SharedLinkState.ChooseType,
    creator: CREATOR,
    asset_info: [],
    max_use: 1n,
    use_count: 0n,
    ...overrides,
  };
}

describe("draftLinkStorage", () => {
  describe("isDraftLinkStorageRecord", () => {
    it("returns true when the value has a link envelope", () => {
      expect(
        isDraftLinkStorageRecord({
          link: makeSharedLink(),
          creationStep: LinkStep.ADD_ASSET,
        }),
      ).toBe(true);
    });

    it.each([null, undefined, "link", 1, {}, { link: null }])(
      "returns false for non-envelope value %s",
      (value) => {
        expect(isDraftLinkStorageRecord(value)).toBe(false);
      },
    );
  });

  describe("deriveCreationStepFromLinkState", () => {
    it.each([
      [SharedLinkState.ChooseType, LinkStep.CHOOSE_TYPE],
      [SharedLinkState.AddAsset, LinkStep.ADD_ASSET],
      [SharedLinkState.Preview, LinkStep.PREVIEW],
      [SharedLinkState.Created, LinkStep.CREATED],
    ])("maps shared link state %s to create-link step %s", (state, step) => {
      expect(deriveCreationStepFromLinkState(state)).toBe(step);
    });

    it.each([
      SharedLinkState.Active,
      SharedLinkState.Inactive,
      SharedLinkState.Ended,
    ])("returns undefined for non-create shared link state %s", (state) => {
      expect(deriveCreationStepFromLinkState(state)).toBeUndefined();
    });
  });

  describe("toDraftLink", () => {
    it("restores creationStep from the current storage envelope", () => {
      const link = makeSharedLink({ link_state: SharedLinkState.Preview });
      const record: DraftLinkStorageRecord = {
        link,
        creationStep: LinkStep.LOCK,
      };

      expect(toDraftLink(record)).toEqual({
        ...link,
        creationStep: LinkStep.LOCK,
      });
    });

    it("derives creationStep from the stored link when the envelope has no explicit step", () => {
      const link = makeSharedLink({ link_state: SharedLinkState.AddAsset });

      expect(toDraftLink({ link })).toEqual({
        ...link,
        creationStep: LinkStep.ADD_ASSET,
      });
    });

    it("converts legacy shared links into draft links with derived creationStep", () => {
      const link = makeSharedLink({ link_state: SharedLinkState.Preview });

      expect(toDraftLink(link)).toEqual({
        ...link,
        creationStep: LinkStep.PREVIEW,
      });
    });
  });

  describe("toDraftLinkStorageRecord", () => {
    it("stores backend-compatible link data separately from the create-flow step", () => {
      const draftLink: DraftLink = {
        ...makeSharedLink({ link_state: SharedLinkState.Preview }),
        creationStep: LinkStep.LOCK,
      };

      expect(toDraftLinkStorageRecord(draftLink)).toEqual({
        link: makeSharedLink({ link_state: SharedLinkState.Preview }),
        creationStep: LinkStep.LOCK,
      });
    });
  });
});
