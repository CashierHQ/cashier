import { describe, expect, it } from "vitest";
import { LinkStep } from "$modules/links/types/linkStep";
import { UserLinkStep } from "$modules/links/types/userLinkStep";
import {
  resolveUserLinkRedirect,
  validatePublicLink,
} from "$modules/routing/userLinkRedirects";
import type { RedirectInput } from "$modules/routing/types";

const userId = "user-principal";
const linkId = "public-link-1";

const baseInput: RedirectInput = {
  pathname: `/link/${linkId}`,
  isAuthReady: true,
  isLoading: false,
  currentUserId: userId,
  linkId,
  linkExists: true,
  linkOwnerId: "owner-principal",
  linkState: LinkStep.ACTIVE,
  userState: UserLinkStep.LANDING,
  linkEnded: false,
};

describe("userLinkRedirects", () => {
  describe("validatePublicLink", () => {
    it("waits while public link data is loading", () => {
      expect(validatePublicLink({ ...baseInput, isLoading: true })).toEqual({
        kind: "pending",
      });
    });

    it("redirects to 404 when the URL has no link id", () => {
      expect(validatePublicLink({ ...baseInput, linkId: null })).toEqual({
        kind: "redirect",
        to: "/404",
      });
    });

    it("redirects to 404 when the public link does not exist", () => {
      expect(validatePublicLink({ ...baseInput, linkExists: false })).toEqual({
        kind: "redirect",
        to: "/404",
      });
    });

    it("allows loaded public links", () => {
      expect(validatePublicLink(baseInput)).toBeNull();
    });
  });

  describe("resolveUserLinkRedirect", () => {
    it("allows logged-out visitors on the public landing route", () => {
      expect(
        resolveUserLinkRedirect(
          {
            ...baseInput,
            currentUserId: null,
            userState: null,
          },
          "userLanding",
        ),
      ).toEqual({
        kind: "allow",
        screen: "userLanding",
      });
    });

    it("redirects logged-out visitors from the use route to landing", () => {
      expect(
        resolveUserLinkRedirect(
          {
            ...baseInput,
            currentUserId: null,
            pathname: `/link/${linkId}/use`,
            userState: null,
          },
          "userUse",
        ),
      ).toEqual({
        kind: "redirect",
        to: `/link/${linkId}`,
      });
    });

    it("shows link ended when an uncompleted user opens an ended link", () => {
      expect(
        resolveUserLinkRedirect(
          {
            ...baseInput,
            linkEnded: true,
            userState: UserLinkStep.LANDING,
          },
          "userLanding",
        ),
      ).toEqual({
        kind: "allow",
        screen: "linkEnded",
      });
    });

    it("allows completed users to see completed state for ended links", () => {
      expect(
        resolveUserLinkRedirect(
          {
            ...baseInput,
            pathname: `/link/${linkId}/use`,
            linkEnded: true,
            userState: UserLinkStep.COMPLETED,
          },
          "userUse",
        ),
      ).toEqual({
        kind: "allow",
        screen: "userCompleted",
      });
    });

    it("redirects landing route to use route after the user enters the flow", () => {
      expect(
        resolveUserLinkRedirect(
          {
            ...baseInput,
            userState: UserLinkStep.ADDRESS_UNLOCKED,
          },
          "userLanding",
        ),
      ).toEqual({
        kind: "redirect",
        to: `/link/${linkId}/use`,
      });
    });

    it("allows landing route before the user enters the flow", () => {
      expect(
        resolveUserLinkRedirect(
          {
            ...baseInput,
            userState: UserLinkStep.LANDING,
          },
          "userLanding",
        ),
      ).toEqual({
        kind: "allow",
        screen: "userLanding",
      });
    });

    it.each([null, UserLinkStep.LANDING])(
      "redirects use route with %s state to landing",
      (userState) => {
        expect(
          resolveUserLinkRedirect(
            {
              ...baseInput,
              pathname: `/link/${linkId}/use`,
              userState,
            },
            "userUse",
          ),
        ).toEqual({
          kind: "redirect",
          to: `/link/${linkId}`,
        });
      },
    );

    it.each([
      [UserLinkStep.ADDRESS_UNLOCKED, "userAddressUnlocked"],
      [UserLinkStep.ADDRESS_LOCKED, "userAddressLocked"],
      [UserLinkStep.GATE, "userGate"],
      [UserLinkStep.COMPLETED, "userCompleted"],
    ] as const)("allows use route to render %s state", (userState, screen) => {
      expect(
        resolveUserLinkRedirect(
          {
            ...baseInput,
            pathname: `/link/${linkId}/use`,
            userState,
          },
          "userUse",
        ),
      ).toEqual({
        kind: "allow",
        screen,
      });
    });

    it("returns validation redirects before state-specific redirects", () => {
      expect(
        resolveUserLinkRedirect(
          {
            ...baseInput,
            linkExists: false,
            userState: UserLinkStep.ADDRESS_UNLOCKED,
          },
          "userUse",
        ),
      ).toEqual({
        kind: "redirect",
        to: "/404",
      });
    });
  });
});
