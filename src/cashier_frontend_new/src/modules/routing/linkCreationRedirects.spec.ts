import { describe, expect, it } from "vitest";
import { LinkStep } from "$modules/links/types/linkStep";
import {
  resolveCreationRedirect,
  validateOwnerAccess,
} from "$modules/routing/linkCreationRedirects";
import type { RedirectInput } from "$modules/routing/types";

const ownerId = "owner-principal";
const otherUserId = "other-principal";
const linkId = "link-1";

const baseInput: RedirectInput = {
  pathname: `/link/create/${linkId}`,
  isAuthReady: true,
  isLoading: false,
  currentUserId: ownerId,
  linkId,
  linkExists: true,
  linkOwnerId: ownerId,
  linkState: LinkStep.CHOOSE_TYPE,
  userState: null,
  linkEnded: false,
};

describe("linkCreationRedirects", () => {
  describe("validateOwnerAccess", () => {
    it("waits while link data is loading", () => {
      expect(validateOwnerAccess({ ...baseInput, isLoading: true })).toEqual({
        kind: "pending",
      });
    });

    it("redirects to link list when the URL has no link id", () => {
      expect(validateOwnerAccess({ ...baseInput, linkId: null })).toEqual({
        kind: "redirect",
        to: "/links",
      });
    });

    it("redirects to link list when the link does not exist", () => {
      expect(validateOwnerAccess({ ...baseInput, linkExists: false })).toEqual({
        kind: "redirect",
        to: "/links",
      });
    });

    it("redirects to link list when the user is logged out", () => {
      expect(
        validateOwnerAccess({ ...baseInput, currentUserId: null }),
      ).toEqual({
        kind: "redirect",
        to: "/links",
      });
    });

    it("redirects to link list when the user is not the owner", () => {
      expect(
        validateOwnerAccess({ ...baseInput, currentUserId: otherUserId }),
      ).toEqual({
        kind: "redirect",
        to: "/links",
      });
    });

    it("redirects to link list when owner state is missing", () => {
      expect(validateOwnerAccess({ ...baseInput, linkState: null })).toEqual({
        kind: "redirect",
        to: "/links",
      });
    });

    it("allows owner routes with a loaded owned link and state", () => {
      expect(validateOwnerAccess(baseInput)).toBeNull();
    });
  });

  describe("resolveCreationRedirect", () => {
    it.each([
      [LinkStep.CHOOSE_TYPE, "createChooseType"],
      [LinkStep.ADD_ASSET, "createAddAsset"],
      [LinkStep.PREVIEW, "createPreview"],
      [LinkStep.CREATED, "createCreated"],
    ] as const)(
      "allows create route to render %s state",
      (linkState, screen) => {
        expect(
          resolveCreationRedirect({ ...baseInput, linkState }, "create"),
        ).toEqual({
          kind: "allow",
          screen,
        });
      },
    );

    it.each([LinkStep.ACTIVE, LinkStep.INACTIVE, LinkStep.ENDED])(
      "redirects create route with %s state to detail",
      (linkState) => {
        expect(
          resolveCreationRedirect({ ...baseInput, linkState }, "create"),
        ).toEqual({
          kind: "redirect",
          to: `/link/detail/${linkId}`,
        });
      },
    );

    it.each([LinkStep.CHOOSE_TYPE, LinkStep.ADD_ASSET, LinkStep.PREVIEW])(
      "redirects detail route with %s state to create",
      (linkState) => {
        expect(
          resolveCreationRedirect(
            {
              ...baseInput,
              pathname: `/link/detail/${linkId}`,
              linkState,
            },
            "detail",
          ),
        ).toEqual({
          kind: "redirect",
          to: `/link/create/${linkId}`,
        });
      },
    );

    it.each([
      LinkStep.CREATED,
      LinkStep.ACTIVE,
      LinkStep.INACTIVE,
      LinkStep.ENDED,
    ])("allows detail route to render %s state", (linkState) => {
      expect(
        resolveCreationRedirect(
          {
            ...baseInput,
            pathname: `/link/detail/${linkId}`,
            linkState,
          },
          "detail",
        ),
      ).toEqual({
        kind: "allow",
        screen: "linkDetail",
      });
    });

    it("returns validation redirects before state-specific redirects", () => {
      expect(
        resolveCreationRedirect(
          {
            ...baseInput,
            linkExists: false,
            linkState: LinkStep.ACTIVE,
          },
          "create",
        ),
      ).toEqual({
        kind: "redirect",
        to: "/links",
      });
    });
  });
});
