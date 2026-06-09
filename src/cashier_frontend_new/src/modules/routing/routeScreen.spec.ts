import { describe, expect, it } from "vitest";
import { getRouteArea, parseRoute } from "./routeScreen";

describe("routeScreen", () => {
  describe("parseRoute", () => {
    it.each([
      ["/", { area: "home", linkId: null }],
      ["//", { area: "home", linkId: null }],
      ["/links", { area: "linkList", linkId: null }],
      ["/link/create/draft-1", { area: "create", linkId: "draft-1" }],
      ["/link/detail/link-1", { area: "detail", linkId: "link-1" }],
      ["/link/public-1", { area: "userLanding", linkId: "public-1" }],
      ["/link/public-1/use", { area: "userUse", linkId: "public-1" }],
    ] as const)("maps %s to the expected route match", (pathname, expected) => {
      expect(parseRoute(pathname)).toEqual(expected);
    });

    it.each([
      "/unknown",
      "/link",
      "/link/create",
      "/link/detail",
      "/link/public-1/unknown",
      "/link/create/draft-1/extra",
    ])("maps %s to unknown", (pathname) => {
      expect(parseRoute(pathname)).toEqual({
        area: "unknown",
        linkId: null,
      });
    });
  });

  describe("getRouteArea", () => {
    it("returns only the parsed route area", () => {
      expect(getRouteArea("/link/create/draft-1")).toBe("create");
    });
  });
});
