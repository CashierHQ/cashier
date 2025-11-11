import type { Link } from "./link/link";
import type TempLink from "./tempLink";

export type GroupedLink = {
  date: bigint;
  links: Array<Link | TempLink>;
};

export type UnifiedLinkList = Array<Link | TempLink>;
