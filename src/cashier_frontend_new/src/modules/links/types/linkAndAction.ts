import type Action from "./action/action";
import type { Link } from "./link/link";

export type LinkAndAction = {
  link: Link;
  action?: Action | undefined;
};
