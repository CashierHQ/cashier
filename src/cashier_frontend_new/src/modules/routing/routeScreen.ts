/**
 * Known route areas that the redirect policy understands.
 *
 * These are broad URL areas, not renderable screens.
 */
export type RouteArea =
  | "home"
  | "linkList"
  | "create"
  | "detail"
  | "userLanding"
  | "userUse"
  | "unknown";

/**
 * Parsed result of matching a pathname to a known route pattern.
 *
 * @property area the high-level route area the pathname belongs to
 * @property linkId the link id parsed from the pathname, if any
 */
export type RouteMatch = {
  area: RouteArea;
  linkId: string | null;
};

function getPathParts(pathname: string): string[] {
  return pathname.split("/").filter(Boolean);
}

/**
 * Converts a pathname into a route area used by redirect policies.
 *
 * @param pathname browser pathname, eg `/link/create/<link-id>`
 * @returns the matched route area with link id, if any
 */
export function parseRoute(pathname: string): RouteMatch {
  const parts = getPathParts(pathname);

  if (parts.length === 0) return { area: "home", linkId: null };
  if (parts.length === 1 && parts[0] === "links") {
    return { area: "linkList", linkId: null };
  }
  if (parts[0] !== "link") return { area: "unknown", linkId: null };

  if (parts.length === 3 && parts[1] === "create") {
    return { area: "create", linkId: parts[2] ?? null };
  }
  if (parts.length === 3 && parts[1] === "detail") {
    return { area: "detail", linkId: parts[2] ?? null };
  }
  if (parts.length === 2) {
    return { area: "userLanding", linkId: parts[1] ?? null };
  }
  if (parts.length === 3 && parts[2] === "use") {
    return { area: "userUse", linkId: parts[1] ?? null };
  }

  return { area: "unknown", linkId: null };
}

/**
 * Helper for callers that only need the route area.
 *
 * @param pathname browser pathname, eg `/link/create/<link-id>`
 * @returns the route area parsed from the pathname
 */
export function getRouteArea(pathname: string): RouteArea {
  return parseRoute(pathname).area;
}
