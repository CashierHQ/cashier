import type Action from "./action/action";
import type { Link } from "./link/link";
import type { LinkUserStateValue } from "./link/linkUserState";

export class LinkAction {
  link: Link;
  action?: Action | undefined;
  link_user_state?: LinkUserStateValue;

  constructor(
    link: Link,
    action?: Action | undefined,
    link_user_state?: LinkUserStateValue,
  ) {
    this.link = link;
    this.action = action;
    this.link_user_state = link_user_state;
  }
}
