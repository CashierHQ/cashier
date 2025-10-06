import { LinkType, type TipLink } from "../types";
import { type LinkState } from "./linkstates";
import { ChooseLinkTypeState } from "./linkstates/chooseLinkType";

export class LinkStore {
  #state: LinkState;
  public title: string;
  public linkType: LinkType;
  public tipLink?: TipLink;
  #id?: string;

  constructor() {
    this.#state = $state<LinkState>(new ChooseLinkTypeState(this));
    this.title = $state<string>("");
    this.linkType = $state<LinkType>(LinkType.TIP);
    this.tipLink = $state<TipLink | undefined>(undefined);
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

  async goNext(): Promise<void> {
    await this.#state.goNext();
  }

  async goBack(): Promise<void> {
    await this.#state.goBack();
  }
}
