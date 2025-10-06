import { cashierBackendService } from "$modules/links/services/cashierBackend";
import {
  LinkStep,
  LinkType,
  type CreateLinkData,
  type TipLink,
} from "../types";

export interface LinkState {
  readonly step: LinkStep;
  goNext(): Promise<void>;
  goBack(): Promise<void>;
}

class ChooseLinkTypeState implements LinkState {
  readonly step = LinkStep.CHOOSE_TYPE;
  #link: Link;

  constructor(link: Link) {
    this.#link = link;
  }

  async goNext(): Promise<void> {
    if (this.#link.title.trim() === "") {
      throw new Error("Title is required to proceed");
    }

    if (this.#link.linkType !== LinkType.TIP) {
      throw new Error("Only Tip link type is supported currently");
    }

    this.#link.state = new AddAssetState(this.#link);
  }

  goBack(): Promise<void> {
    throw new Error("No previous state from ChooseLinkType");
  }
}

class AddAssetState implements LinkState {
  readonly step = LinkStep.ADD_ASSET;
  #link: Link;

  constructor(link: Link) {
    this.#link = link;
  }

  async goNext(): Promise<void> {
    if (!this.#link.tipLink) {
      throw new Error("Tip link details are required to proceed");
    }
    if (this.#link.tipLink.asset.trim() === "") {
      throw new Error("Asset is required to proceed");
    }
    if (this.#link.tipLink.amount <= 0) {
      throw new Error("Amount must be greater than zero to proceed");
    }

    this.#link.state = new PreviewState(this.#link);
  }

  async goBack(): Promise<void> {
    this.#link.state = new ChooseLinkTypeState(this.#link);
  }
}

class PreviewState implements LinkState {
  readonly step = LinkStep.PREVIEW;
  #link: Link;

  constructor(link: Link) {
    this.#link = link;
  }

  async goNext(): Promise<void> {
    const data: CreateLinkData = {
      title: this.#link.title,
      linkType: this.#link.linkType,
      tipLink: this.#link.tipLink,
    };

    const result = await cashierBackendService.createLink(data);
    if (result.isOk()) {
      // creation succeeded — reset the form and return the created link
      this.#link.state = new CreatedState(this.#link);
      this.#link.id = result.value.id;
    }
  }

  async goBack(): Promise<void> {
    this.#link.state = new AddAssetState(this.#link);
  }
}

class CreatedState implements LinkState {
  readonly step = LinkStep.CREATED;
  #link: Link;

  constructor(link: Link) {
    this.#link = link;
  }

  async goNext(): Promise<void> {
    throw new Error("No next state from Created");
  }

  async goBack(): Promise<void> {
    throw new Error("No previous state from Created");
  }
}

export class Link {
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
