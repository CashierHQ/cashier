import type Action from "../types/action/action";
import type { TipLink } from "../types/createLinkData";
import type { Link } from "../types/link/link";
import { LinkState as FrontendState } from "../types/link/linkState";
import { LinkType } from "../types/link/linkType";
import type { LinkState } from "./linkStates";
import { LinkActiveState } from "./linkStates/active";
import { ChooseLinkTypeState } from "./linkStates/chooseLinkType";
import { LinkInactiveState } from "./linkStates/inactive";

// Simple reactive state management
export class LinkStore {
  // Private state variables
  #state: LinkState;
  // the raw Link object received from backend (kept for detail views)
  public link?: Link;
  // public state variables
  public title: string;
  public linkType: LinkType;
  public tipLink?: TipLink;
  public action?: Action;
  // ID of the created link (if any)
  #id?: string;

  constructor() {
    this.#state = $state<LinkState>(new ChooseLinkTypeState(this));
    this.title = $state<string>("");
    this.linkType = $state<LinkType>(LinkType.TIP);
    this.tipLink = $state<TipLink | undefined>(undefined);
    this.action = $state<Action | undefined>(undefined);
    this.link = $state<Link | undefined>(undefined);
  }

  get state(): LinkState {
    return this.#state;
  }

  set state(state: LinkState) {
    this.#state = state;
  }

  get id(): string | undefined {
    return this.#id;
  }

  set id(id: string | undefined) {
    this.#id = id;
  }

  // Move to the next state
  async goNext(): Promise<void> {
    await this.#state.goNext();
  }

  // Move to the previous state
  async goBack(): Promise<void> {
    await this.#state.goBack();
  }

  // Get intent properties as an array of objects (for reactive display)
  getIntentProperties() {
    if (!this.action) return [];

    return this.action.intents.map((intent, index) => ({
      index: index + 1,
      id: intent.id,
      task: intent.task,
      type: intent.type,
      createdAt: intent.created_at,
      state: intent.state,
    }));
  }

  // Initialize LinkStore from Link and Action get from linkQuery
  from(link: Link, action?: Action) {
    // store the full link for detail views
    this.link = link;
    this.title = link.title;
    this.linkType = link.link_type;
    this.action = action;
    this.#id = link.id;

    switch (link.state) {
      case FrontendState.ACTIVE:
        this.#state = new LinkActiveState(this);
        break;
      case FrontendState.INACTIVE:
        this.#state = new LinkInactiveState(this);
        break;
    }

    switch (link.link_type) {
      case LinkType.TIP:
        this.tipLink = {
          useAmount: link.link_use_action_max_count,
          // Assuming only one asset per tip link for simplicity
          asset: link.asset_info[0].asset.address!.toString(),
        };
        break;
    }
  }
}
