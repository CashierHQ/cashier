import type { Link } from "./link/link";
import type TempLink from "./tempLink";

export type GroupedLink = {
  date: bigint;
  links: UnifiedLinkList;
};

export type UnifiedLinkItem = Link | TempLink;

export type UnifiedLinkList = Array<UnifiedLinkItem>;
