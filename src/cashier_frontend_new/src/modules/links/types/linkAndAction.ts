import type Action from "./action/action";
import { Link, LinkMapper } from "./link/link";
import type { LinkUserStateValue } from "./link/linkUserState";
import { ActionMapper } from "./action/action";

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

export class LinkActionMapper {
  // Devalue serde for LinkAction. Stores `link` and `action` using their
  // existing serdes and keeps `link_user_state` as a simple string value.
  static serde = {
    serialize: {
      LinkAction: (value: unknown) => {
        const la = value as LinkAction | undefined;
        if (!la || !(la.link instanceof Link)) return undefined;
        return {
          link: LinkMapper.serde.serialize.Link(la.link),
          action: la.action
            ? ActionMapper.serde.serialize.Action(la.action)
            : undefined,
          link_user_state: la.link_user_state,
        };
      },
    },
    deserialize: {
      LinkAction: (obj: unknown) => {
        const s = obj as ReturnType<
          typeof LinkActionMapper.serde.serialize.LinkAction
        >;

        if (!s) {
          throw new Error("Invalid serialized LinkAction object");
        }

        const link = LinkMapper.serde.deserialize.Link(s.link);
        const action = s.action
          ? ActionMapper.serde.deserialize.Action(s.action)
          : undefined;
        const link_user_state = s.link_user_state;

        return new LinkAction(link, action, link_user_state);
      },
    },
  };
}
