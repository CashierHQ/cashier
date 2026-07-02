import { describe, expect, it, vi } from "vitest";
import { CREATE_LINK_PROGRESS_SEGMENTS } from "$modules/creationLink/constants/createLinkHeader";
import { LinkStep } from "$modules/links/types/linkStep";
import {
  getCreateLinkCardHeaderDisplayName,
  getCreateLinkProgress,
} from "$modules/creationLink/utils/createLinkHeader";

vi.mock("$lib/i18n", () => ({
  locale: {
    t: vi.fn((key: string) => key),
  },
}));

describe("createLinkHeader", () => {
  describe("getCreateLinkProgress", () => {
    it.each([
      [LinkStep.CHOOSE_TYPE, 1],
      [LinkStep.ADD_ASSET, 2],
      [LinkStep.LOCK, 3],
      [LinkStep.PREVIEW, 4],
      [LinkStep.CREATED, 4],
    ])("returns %i progress segments for step %i", (linkStep, progress) => {
      expect(getCreateLinkProgress(linkStep)).toBe(progress);
    });

    it.each([LinkStep.ACTIVE, LinkStep.INACTIVE, LinkStep.ENDED])(
      "returns 0 progress segments for non-create step %i",
      (linkStep) => {
        expect(getCreateLinkProgress(linkStep)).toBe(0);
      },
    );
  });

  describe("getCreateLinkCardHeaderDisplayName", () => {
    it.each([
      [LinkStep.ADD_ASSET, "links.linkForm.header.addAssets"],
      [LinkStep.LOCK, "links.linkForm.lock.title"],
      [LinkStep.PREVIEW, "links.linkForm.header.createLink"],
    ])("returns the localized title key for step %i", (linkStep, titleKey) => {
      expect(getCreateLinkCardHeaderDisplayName(linkStep, "Draft title")).toBe(
        titleKey,
      );
    });

    it("returns the trimmed draft link title for non-step-specific screens", () => {
      expect(
        getCreateLinkCardHeaderDisplayName(
          LinkStep.CHOOSE_TYPE,
          "  Draft title  ",
        ),
      ).toBe("Draft title");
    });

    it("returns the fallback link-name title when the draft link title is empty", () => {
      expect(
        getCreateLinkCardHeaderDisplayName(LinkStep.CHOOSE_TYPE, " "),
      ).toBe("links.linkForm.header.linkName");
    });
  });

  it("uses four progress segments for the create-link flow", () => {
    expect(CREATE_LINK_PROGRESS_SEGMENTS).toBe(4);
  });
});
