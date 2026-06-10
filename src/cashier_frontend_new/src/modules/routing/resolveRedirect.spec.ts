import { describe, expect, it } from "vitest";
import { LinkStep } from "$modules/links/types/linkStep";
import { UserLinkStep } from "$modules/links/types/userLinkStep";
import { getRouteArea, parseRoute } from "$modules/routing/routeScreen";
import { resolveRedirect } from "$modules/routing/resolveRedirect";
import type {
  RedirectDecision,
  RedirectInput,
  RouteScreen,
} from "$modules/routing/types";

const ownerId = "owner-1";
const otherUserId = "user-2";
const linkId = "link-1";
const publicLinkId = "public-1";

const baseInput: RedirectInput = {
  pathname: "/",
  isAuthReady: true,
  isLoading: false,
  currentUserId: null,
  linkId: null,
  linkExists: false,
  linkOwnerId: null,
  linkState: null,
  userState: null,
  linkEnded: false,
};

const createPath = `/link/create/${linkId}` as const;
const detailPath = `/link/detail/${linkId}` as const;
const publicLandingPath = `/link/${publicLinkId}` as const;
const publicUsePath = `/link/${publicLinkId}/use` as const;

function ownerInput(overrides: Partial<RedirectInput>): RedirectInput {
  return {
    ...baseInput,
    pathname: createPath,
    currentUserId: ownerId,
    linkId,
    linkExists: true,
    linkOwnerId: ownerId,
    ...overrides,
  };
}

function otherUserInput(overrides: Partial<RedirectInput>): RedirectInput {
  return ownerInput({
    currentUserId: otherUserId,
    ...overrides,
  });
}

function publicInput(overrides: Partial<RedirectInput>): RedirectInput {
  return {
    ...baseInput,
    pathname: publicLandingPath,
    currentUserId: otherUserId,
    linkId: publicLinkId,
    linkExists: true,
    linkState: LinkStep.ACTIVE,
    ...overrides,
  };
}

describe("routing policy", () => {
  describe("route parsing", () => {
    it("maps known paths to route areas", () => {
      expect(getRouteArea("/")).toBe("home");
      expect(getRouteArea("/links")).toBe("linkList");
      expect(getRouteArea("/link/create/abc")).toBe("create");
      expect(getRouteArea("/link/detail/abc")).toBe("detail");
      expect(getRouteArea("/link/abc")).toBe("userLanding");
      expect(getRouteArea("/link/abc/use")).toBe("userUse");
    });

    it("extracts link ids from link routes", () => {
      expect(parseRoute("/link/create/draft-1")).toEqual({
        area: "create",
        linkId: "draft-1",
      });
      expect(parseRoute("/link/detail/link-1")).toEqual({
        area: "detail",
        linkId: "link-1",
      });
      expect(parseRoute("/link/public-1")).toEqual({
        area: "userLanding",
        linkId: "public-1",
      });
      expect(parseRoute("/link/public-1/use")).toEqual({
        area: "userUse",
        linkId: "public-1",
      });
    });
  });

  describe("global rules", () => {
    it("waits while auth is not ready", () => {
      expect(resolveRedirect({ ...baseInput, isAuthReady: false })).toEqual({
        kind: "pending",
      });
    });

    it("[LO-01] allows logged-out users on home", () => {
      expect(resolveRedirect(baseInput)).toEqual({
        kind: "allow",
        screen: "home",
      });
    });

    it("redirects logged-in users from home to link list", () => {
      expect(resolveRedirect({ ...baseInput, currentUserId: ownerId })).toEqual(
        {
          kind: "redirect",
          to: "/links",
        },
      );
    });

    it("[LO-02] redirects logged-out users from link list to home", () => {
      expect(resolveRedirect({ ...baseInput, pathname: "/links" })).toEqual({
        kind: "redirect",
        to: "/",
      });
    });

    it("allows logged-in users on link list", () => {
      expect(
        resolveRedirect({
          ...baseInput,
          pathname: "/links",
          currentUserId: ownerId,
        }),
      ).toEqual({
        kind: "allow",
        screen: "linkList",
      });
    });

    it.each([
      ["LO-03", "choose type", createPath, LinkStep.CHOOSE_TYPE],
      ["LO-04", "add asset", createPath, LinkStep.ADD_ASSET],
      ["LO-06", "preview", createPath, LinkStep.PREVIEW],
      ["LO-07", "link detail", detailPath, LinkStep.ACTIVE],
    ] as const)(
      "[%s] redirects logged-out users from %s to home",
      (_id, _label, pathname, linkState) => {
        expect(
          resolveRedirect({
            ...baseInput,
            pathname,
            linkId,
            linkExists: true,
            linkOwnerId: ownerId,
            linkState,
          }),
        ).toEqual({
          kind: "redirect",
          to: "/",
        });
      },
    );
  });

  describe("owner creation/detail rules", () => {
    it("waits while owner link data is loading", () => {
      expect(
        resolveRedirect(
          ownerInput({
            isLoading: true,
          }),
        ),
      ).toEqual({ kind: "pending" });
    });

    it("redirects invalid owner links to link list", () => {
      expect(
        resolveRedirect(
          ownerInput({
            pathname: "/link/create/missing-link",
            linkId: "missing-link",
            linkExists: false,
          }),
        ),
      ).toEqual({
        kind: "redirect",
        to: "/links",
      });
    });

    it("redirects non-owners to link list", () => {
      expect(
        resolveRedirect(
          otherUserInput({
            linkState: LinkStep.CHOOSE_TYPE,
          }),
        ),
      ).toEqual({
        kind: "redirect",
        to: "/links",
      });
    });

    it.each([
      ["NS-03", "choose type"],
      ["NS-04", "add asset"],
      ["NS-06", "preview"],
    ] as const)(
      "[%s] redirects no-state link from %s route to link list",
      () => {
        expect(
          resolveRedirect(
            ownerInput({
              linkState: null,
            }),
          ),
        ).toEqual({
          kind: "redirect",
          to: "/links",
        });
      },
    );

    it("[NS-07] redirects no-state link from detail route to link list", () => {
      expect(
        resolveRedirect(
          ownerInput({
            pathname: detailPath,
            linkState: null,
          }),
        ),
      ).toEqual({
        kind: "redirect",
        to: "/links",
      });
    });

    it.each([
      ["CT-03", "choose type", LinkStep.CHOOSE_TYPE, "createChooseType"],
      ["CT-04", "add asset", LinkStep.CHOOSE_TYPE, "createChooseType"],
      ["CT-06", "preview", LinkStep.CHOOSE_TYPE, "createChooseType"],
      ["AA-03", "choose type", LinkStep.ADD_ASSET, "createAddAsset"],
      ["AA-04", "add asset", LinkStep.ADD_ASSET, "createAddAsset"],
      ["AA-06", "preview", LinkStep.ADD_ASSET, "createAddAsset"],
      ["PV-03", "choose type", LinkStep.PREVIEW, "createPreview"],
      ["PV-04", "add asset", LinkStep.PREVIEW, "createPreview"],
      ["PV-06", "preview", LinkStep.PREVIEW, "createPreview"],
      ["CR-03", "choose type", LinkStep.CREATED, "createCreated"],
      ["CR-04", "add asset", LinkStep.CREATED, "createCreated"],
      ["CR-06", "preview", LinkStep.CREATED, "createCreated"],
    ] as const)(
      "[%s] owner lands on %s with %s link and sees the correct create screen",
      (_id, _scenario, linkState, screen) => {
        expect(
          resolveRedirect(
            ownerInput({
              linkState,
            }),
          ),
        ).toEqual({
          kind: "allow",
          screen,
        });
      },
    );

    it.each([
      ["CT-07", LinkStep.CHOOSE_TYPE],
      ["AA-07", LinkStep.ADD_ASSET],
      ["PV-07", LinkStep.PREVIEW],
    ] as const)(
      "[%s] redirects owner with %s link from detail to create route",
      (_id, linkState) => {
        expect(
          resolveRedirect(
            ownerInput({
              pathname: detailPath,
              linkState,
            }),
          ),
        ).toEqual({
          kind: "redirect",
          to: createPath,
        });
      },
    );

    it("[CR-07] allows owner with created link on detail", () => {
      expect(
        resolveRedirect(
          ownerInput({
            pathname: detailPath,
            linkState: LinkStep.CREATED,
          }),
        ),
      ).toEqual({
        kind: "allow",
        screen: "linkDetail",
      });
    });

    it.each([
      ["AC-03", "choose type", LinkStep.ACTIVE],
      ["AC-04", "add asset", LinkStep.ACTIVE],
      ["AC-06", "preview", LinkStep.ACTIVE],
      ["IN-03", "choose type", LinkStep.INACTIVE],
      ["IN-04", "add asset", LinkStep.INACTIVE],
      ["IN-06", "preview", LinkStep.INACTIVE],
      ["IE-03", "choose type", LinkStep.ENDED],
      ["IE-04", "add asset", LinkStep.ENDED],
      ["IE-06", "preview", LinkStep.ENDED],
    ] as const)(
      "[%s] redirects owner from %s to detail",
      (_id, _scenario, linkState) => {
        expect(
          resolveRedirect(
            ownerInput({
              linkState,
            }),
          ),
        ).toEqual({
          kind: "redirect",
          to: detailPath,
        });
      },
    );

    it.each([
      ["AC-07", LinkStep.ACTIVE],
      ["IN-07", LinkStep.INACTIVE],
      ["IE-07", LinkStep.ENDED],
    ] as const)(
      "[%s] allows owner with %s link on detail",
      (_id, linkState) => {
        expect(
          resolveRedirect(
            ownerInput({
              pathname: detailPath,
              linkState,
            }),
          ),
        ).toEqual({
          kind: "allow",
          screen: "linkDetail",
        });
      },
    );

    it.each([
      ["CT-08", "choose type", createPath, LinkStep.CHOOSE_TYPE],
      ["CT-09", "add asset", createPath, LinkStep.CHOOSE_TYPE],
      ["CT-11", "preview", createPath, LinkStep.CHOOSE_TYPE],
      ["CT-12", "link detail", detailPath, LinkStep.CHOOSE_TYPE],
      ["AA-08", "choose type", createPath, LinkStep.ADD_ASSET],
      ["AA-09", "add asset", createPath, LinkStep.ADD_ASSET],
      ["AA-11", "preview", createPath, LinkStep.ADD_ASSET],
      ["AA-12", "link detail", detailPath, LinkStep.ADD_ASSET],
      ["PV-08", "choose type", createPath, LinkStep.PREVIEW],
      ["PV-09", "add asset", createPath, LinkStep.PREVIEW],
      ["PV-11", "preview", createPath, LinkStep.PREVIEW],
      ["PV-12", "link detail", detailPath, LinkStep.PREVIEW],
      ["CR-08", "choose type", createPath, LinkStep.CREATED],
      ["CR-09", "add asset", createPath, LinkStep.CREATED],
      ["CR-11", "preview", createPath, LinkStep.CREATED],
      ["CR-12", "link detail", detailPath, LinkStep.CREATED],
      ["AC-08", "choose type", createPath, LinkStep.ACTIVE],
      ["AC-09", "add asset", createPath, LinkStep.ACTIVE],
      ["AC-11", "preview", createPath, LinkStep.ACTIVE],
      ["AC-12", "link detail", detailPath, LinkStep.ACTIVE],
      ["IN-08", "choose type", createPath, LinkStep.INACTIVE],
      ["IN-09", "add asset", createPath, LinkStep.INACTIVE],
      ["IN-11", "preview", createPath, LinkStep.INACTIVE],
      ["IN-12", "link detail", detailPath, LinkStep.INACTIVE],
      ["IE-08", "choose type", createPath, LinkStep.ENDED],
      ["IE-09", "add asset", createPath, LinkStep.ENDED],
      ["IE-11", "preview", createPath, LinkStep.ENDED],
      ["IE-12", "link detail", detailPath, LinkStep.ENDED],
    ] as const)(
      "[%s] redirects other user from %s to link list",
      (_id, _scenario, pathname, linkState) => {
        expect(
          resolveRedirect(
            otherUserInput({
              pathname,
              linkState,
            }),
          ),
        ).toEqual({
          kind: "redirect",
          to: "/links",
        });
      },
    );
  });

  describe("public user rules", () => {
    it("[IP-01] redirects invalid public landing links to not found", () => {
      expect(
        resolveRedirect({
          ...baseInput,
          pathname: "/link/missing-link",
          linkId: "missing-link",
          linkExists: false,
        }),
      ).toEqual({
        kind: "redirect",
        to: "/404",
      });
    });

    it("[IP-02] redirects invalid public use links to not found", () => {
      expect(
        resolveRedirect({
          ...baseInput,
          pathname: "/link/missing-link/use",
          currentUserId: otherUserId,
          linkId: "missing-link",
          linkExists: false,
        }),
      ).toEqual({
        kind: "redirect",
        to: "/404",
      });
    });

    it("[UL-01] allows logged-out users on public user landing", () => {
      expect(
        resolveRedirect(
          publicInput({
            currentUserId: null,
          }),
        ),
      ).toEqual({
        kind: "allow",
        screen: "userLanding",
      });
    });

    it.each([
      ["UL-02", "address unlocked", UserLinkStep.ADDRESS_UNLOCKED],
      ["UL-03", "address locked", UserLinkStep.ADDRESS_LOCKED],
      ["UL-04", "gate", UserLinkStep.GATE],
      ["UL-05", "completed", UserLinkStep.COMPLETED],
    ] as const)(
      "[%s] redirects logged-out users from %s to user landing",
      (_id, _label, userState) => {
        expect(
          resolveRedirect(
            publicInput({
              pathname: publicUsePath,
              currentUserId: null,
              userState,
            }),
          ),
        ).toEqual({
          kind: "redirect",
          to: publicLandingPath,
        });
      },
    );

    it.each([
      ["UE-00", "logged-out landing", publicLandingPath, null],
      ["UE-01", "landing", publicLandingPath, otherUserId],
      ["UE-02", "address unlocked", publicUsePath, otherUserId],
      ["UE-03", "address locked", publicUsePath, otherUserId],
      ["UE-04", "gate", publicUsePath, otherUserId],
      ["UE-05", "completed", publicUsePath, otherUserId],
    ] as const)(
      "[%s] renders link ended when link ended before completion from %s",
      (_id, _label, pathname, currentUserId) => {
        expect(
          resolveRedirect(
            publicInput({
              pathname,
              currentUserId,
              linkState: LinkStep.ENDED,
              linkEnded: true,
              userState: UserLinkStep.ADDRESS_UNLOCKED,
            }),
          ),
        ).toEqual({
          kind: "allow",
          screen: "linkEnded",
        });
      },
    );

    it.each([
      ["UI-01", "logged-out landing", publicLandingPath, null],
      ["UI-02", "logged-in landing", publicLandingPath, otherUserId],
      ["UI-03", "logged-in use flow", publicUsePath, otherUserId],
    ] as const)(
      "[%s] renders link ended when public link is inactive from %s",
      (_id, _label, pathname, currentUserId) => {
        expect(
          resolveRedirect(
            publicInput({
              pathname,
              currentUserId,
              linkState: LinkStep.INACTIVE,
              linkEnded: true,
              userState: UserLinkStep.ADDRESS_UNLOCKED,
            }),
          ),
        ).toEqual({
          kind: "allow",
          screen: "linkEnded",
        });
      },
    );

    it("[UN-01] allows logged-in user with no user state on user landing", () => {
      expect(resolveRedirect(publicInput({ userState: null }))).toEqual({
        kind: "allow",
        screen: "userLanding",
      });
    });

    it.each([
      ["UN-02", "address unlocked"],
      ["UN-03", "address locked"],
      ["UN-04", "gate"],
      ["UN-05", "completed"],
    ] as const)(
      "[%s] redirects logged-in user with no user state from %s to landing",
      () => {
        expect(
          resolveRedirect(
            publicInput({
              pathname: publicUsePath,
              userState: null,
            }),
          ),
        ).toEqual({
          kind: "redirect",
          to: publicLandingPath,
        });
      },
    );

    it("[ULS-01] allows logged-in user with landing state on user landing", () => {
      expect(
        resolveRedirect(
          publicInput({
            userState: UserLinkStep.LANDING,
          }),
        ),
      ).toEqual({
        kind: "allow",
        screen: "userLanding",
      });
    });

    it.each([
      ["ULS-02", "address unlocked"],
      ["ULS-03", "address locked"],
      ["ULS-04", "gate"],
      ["ULS-05", "completed"],
    ] as const)(
      "[%s] redirects logged-in user with landing state from %s to landing",
      () => {
        expect(
          resolveRedirect(
            publicInput({
              pathname: publicUsePath,
              userState: UserLinkStep.LANDING,
            }),
          ),
        ).toEqual({
          kind: "redirect",
          to: publicLandingPath,
        });
      },
    );

    it.each([
      [
        "UA",
        UserLinkStep.ADDRESS_UNLOCKED,
        "userAddressUnlocked",
        "address-unlocked",
      ],
      [
        "ULK",
        UserLinkStep.ADDRESS_LOCKED,
        "userAddressLocked",
        "address-locked",
      ],
      ["UG", UserLinkStep.GATE, "userGate", "gate"],
      ["UC", UserLinkStep.COMPLETED, "userCompleted", "completed"],
    ] as const)(
      "%s user-state routes resolve to the matching use-flow screen",
      (prefix, userState, screen, label) => {
        const rows: ReadonlyArray<
          readonly [string, string, string, RedirectDecision]
        > = [
          [
            `${prefix}-01`,
            "landing",
            publicLandingPath,
            { kind: "redirect", to: publicUsePath },
          ],
          [
            `${prefix}-02`,
            "address unlocked",
            publicUsePath,
            { kind: "allow", screen: screen as RouteScreen },
          ],
          [
            `${prefix}-03`,
            "address locked",
            publicUsePath,
            { kind: "allow", screen: screen as RouteScreen },
          ],
          [
            `${prefix}-04`,
            "gate",
            publicUsePath,
            { kind: "allow", screen: screen as RouteScreen },
          ],
          [
            `${prefix}-05`,
            "completed",
            publicUsePath,
            { kind: "allow", screen: screen as RouteScreen },
          ],
        ];

        for (const [id, scenario, pathname, expected] of rows) {
          expect(
            resolveRedirect(
              publicInput({
                pathname,
                userState,
                linkState:
                  userState === UserLinkStep.COMPLETED
                    ? LinkStep.ENDED
                    : LinkStep.ACTIVE,
                linkEnded: userState === UserLinkStep.COMPLETED,
              }),
            ),
            `[${id}] ${label} user lands on ${scenario}`,
          ).toEqual(expected);
        }
      },
    );
  });
});
