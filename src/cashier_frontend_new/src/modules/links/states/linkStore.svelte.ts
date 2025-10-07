import { CreateLinkData } from "../types/createLinkData";
import { LinkType } from "../types/linkType";
import type { LinkState } from "./linkStates";
import { ChooseLinkTypeState } from "./linkStates/chooseLinkType";

// Simple reactive state management
export class LinkStore {
  // Private state variables
  #state: LinkState;
  // public state variables
  public data: CreateLinkData;
  // ID of the created link (if any)
  #id?: string;

  constructor() {
    this.#state = $state<LinkState>(new ChooseLinkTypeState(this));
    this.data = $state<CreateLinkData>(
      new CreateLinkData({
        title: "",
        linkType: LinkType.TIP,
        tipLink: undefined,
      }),
    );
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
}
