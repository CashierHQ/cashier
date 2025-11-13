import type { Link } from "./link/link";
import type { LinkStateValue } from "./link/linkState";
import type { LinkTypeValue } from "./link/linkType";
import type TempLink from "./tempLink";

export type GroupedLink = {
  date: bigint;
  links: UnifiedLinkList;
};
export type UnifiedLinkList = Array<UnifiedLinkItem>;

export type UnifiedLinkItem = {
  id: string;
  title: string;
  state: LinkStateValue;
  linkType: LinkTypeValue;
  linkCreateAt: bigint;
  isCreated?: boolean;
};

export class UnifiedLinkItemMapper {
  static fromLink(link: Link): UnifiedLinkItem {
    return {
      id: link.id,
      title: link.title,
      state: link.state,
      linkType: link.link_type,
      linkCreateAt: link.create_at,
      isCreated: true,
    };
  }

  static fromTempLink(tempLink: TempLink): UnifiedLinkItem {
    return {
      id: tempLink.id,
      title: tempLink.createLinkData.title || "No title",
      state: tempLink.state,
      linkType: tempLink.createLinkData.linkType,
      linkCreateAt: tempLink.create_at,
      isCreated: false,
    };
  }
}
