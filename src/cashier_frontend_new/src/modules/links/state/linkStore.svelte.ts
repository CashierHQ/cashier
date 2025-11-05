import type Action from "../types/action/action";
import { CreateLinkAsset, CreateLinkData } from "../types/createLinkData";
import type { Link } from "../types/link/link";
import { LinkState as FrontendState } from "../types/link/linkState";
import { LinkType } from "../types/link/linkType";
import type { LinkState } from "./linkCreateStates";
import { LinkActiveState } from "./linkCreateStates/active";
import { ChooseLinkTypeState } from "./linkCreateStates/chooseLinkType";
import { LinkCreatedState } from "./linkCreateStates/created";
import { LinkInactiveState } from "./linkCreateStates/inactive";

// Simple reactive state management
export class LinkStore {
  // Private state variables
  #state: LinkState;
  // the raw Link object received from backend (kept for detail views)
  public link?: Link;
  // draft holds partial data used for creation/edit flows
  public createLinkData: CreateLinkData;
  // `title` and `linkType` are proxied to `draft` (see getters/setters below)
  // tipLink is derived from draft.asset_info (keeps UI convenience while draft is source of truth)
  public action?: Action;
  // ID of the created link (if any)
  #id?: string;
  constructor() {
    this.#state = $state<LinkState>(new ChooseLinkTypeState(this));
    this.createLinkData = $state<CreateLinkData>(
      new CreateLinkData({
        title: "",
        linkType: LinkType.TIP,
        assets: [],
        maxUse: 1,
      }),
    );
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
    try {
      await this.#state.goNext();
    } catch (e) {
      if (e instanceof Error) throw e;
      throw new Error(String(e ?? "rejected promise"));
    }
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
    this.createLinkData.title = link.title;
    this.createLinkData.linkType = link.link_type;

    for (const assetInfo of link.asset_info) {
      const assets = [];
      assets.push(
        new CreateLinkAsset(
          assetInfo.asset.address ? assetInfo.asset.address.toString() : "",
          assetInfo.amount_per_link_use_action,
        ),
      );
      this.createLinkData.assets = assets;
    }

    this.action = action;
    this.#id = link.id;

    switch (link.state) {
      case FrontendState.CREATE_LINK:
        this.#state = new LinkCreatedState(this);
        break;
      case FrontendState.ACTIVE:
        this.#state = new LinkActiveState(this);
        break;
      case FrontendState.INACTIVE:
        this.#state = new LinkInactiveState(this);
        break;
    }
  }
}
