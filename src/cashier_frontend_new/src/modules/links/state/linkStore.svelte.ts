export interface LinkState {
  readonly step: LinkStep;
  goNext(): void;
  goBack(): void;
}

export enum LinkStep {
  CHOOSE_TYPE,
  ADD_ASSET,
  PREVIEW,
}

class ChooseLinkTypeState implements LinkState {
  readonly step = LinkStep.CHOOSE_TYPE;
  #link: Link;

  constructor(link: Link) {
    this.#link = link;
  }

  goNext(): void {
    this.#link.setState(new AddAssetState(this.#link));
  }

  goBack(): void {
    throw new Error("No previous state from ChooseLinkType");
  }
}

class AddAssetState implements LinkState {
  readonly step = LinkStep.ADD_ASSET;
  #link: Link;

  constructor(link: Link) {
    this.#link = link;
  }

  goNext(): void {
    this.#link.setState(new PreviewState(this.#link));
  }

  goBack(): void {
    this.#link.setState(new ChooseLinkTypeState(this.#link));
  }
}

class PreviewState implements LinkState {
  readonly step = LinkStep.PREVIEW;
  #link: Link;

  constructor(link: Link) {
    this.#link = link;
  }

  goNext(): void {
    throw new Error("No next state from Preview");
  }

  goBack(): void {
    this.#link.setState(new AddAssetState(this.#link));
  }
}

export class Link {
  #state;

  constructor() {
    this.#state = $state<LinkState>(new ChooseLinkTypeState(this));
  }

  setState(state: LinkState) {
    this.#state = state;
  }

  getState(): LinkState {
    return this.#state;
  }

  goNext() {
    this.#state.goNext();
  }

  goBack() {
    this.#state.goBack();
  }
}
