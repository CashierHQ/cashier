import type Action from "./action/action";
import type { Link } from "./link/link";
import type { LinkUserStateValue } from "./link/linkUserState";

export type LinkAction = {
  link: Link;
  action?: Action | undefined;
  link_user_state?: LinkUserStateValue;
};
