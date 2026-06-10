import type { Link } from "$modules/links/types/link/link";
import {
  type LinkStateValue,
  LinkStateMapper,
} from "$modules/links/types/link/linkState";
import {
  type LinkTypeValue,
  LinkTypeMapper,
} from "$modules/links/types/link/linkType";
import type { Link as SharedLink } from "$shared";

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

  static fromDraftLink(draftLink: SharedLink): UnifiedLinkItem {
    return {
      id: draftLink.id,
      title: draftLink.title,
      state: LinkStateMapper.fromSharedLinkState(draftLink.link_state),
      linkType: LinkTypeMapper.fromSharedLinkType(draftLink.link_type),
      linkCreateAt: draftLink.created_at ?? 0n,
      isCreated: false,
    };
  }
}
