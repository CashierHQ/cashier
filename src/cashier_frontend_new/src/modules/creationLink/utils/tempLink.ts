import { LinkState } from "$modules/links/types/link/linkState";
import { LinkType } from "$modules/links/types/link/linkType";
import TempLink from "$modules/links/types/tempLink";
import { CreateLinkData } from "../types/createLinkData";

/**
 * Create a new temporary link for the given principal ID
 * @param principalId owner principal identifier
 * @returns The created TempLink object
 */
export function createTempLinkFromPrincipalId(principalId: string): TempLink {
  const ts = Date.now();
  const tsInNanoSec = BigInt(ts) * 1000000n;
  const id = principalId + "-" + ts.toString();
  const state = LinkState.CHOOSING_TYPE;
  const newCreateLinkData = new CreateLinkData({
    title: "",
    linkType: LinkType.TIP,
    assets: [],
    maxUse: 1,
  });

  const tempLink = new TempLink(id, tsInNanoSec, state, newCreateLinkData);
  return tempLink;
}
