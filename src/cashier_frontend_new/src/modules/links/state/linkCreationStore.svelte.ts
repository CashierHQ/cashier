import type Action from "../types/action/action";
import { CreateLinkData } from "../types/createLinkData";
import type { Link } from "../types/link/link";
import { LinkType } from "../types/link/linkType";
import type { LinkCreationState } from "./linkCreationStates";
import { ChooseLinkTypeState } from "./linkCreationStates/chooseLinkType";

// Simple reactive state management
export class LinkCreationStore {
  // Private state variables
  #state: LinkCreationState;
  // draft holds partial data used for creation/edit flows
  public createLinkData: CreateLinkData;
  // the Link object received from backend after creation
  public link?: Link;
  // the Action object received from backend after creation
  public action?: Action;
  #id?: string;

  constructor() {
    this.#state = $state<LinkCreationState>(new ChooseLinkTypeState(this));
    this.createLinkData = $state<CreateLinkData>({
      title: "",
      linkType: LinkType.TIP,
      assets: [],
      maxUse: 1,
    });
    this.action = $state<Action | undefined>(undefined);
    this.link = $state<Link | undefined>(undefined);
  }

  get state(): LinkCreationState {
    return this.#state;
  }

  set state(state: LinkCreationState) {
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
}
