export interface LinkState {
  goNext(): void;
  goBack(): void;
}

class ChooseLinkTypeState implements LinkState {
  #link: Link;

  constructor(link: Link) {
    this.#link = link;
  }

  goNext(): void {
    this.#link.setState(new AddAssetState(this.#link));
  }

  goBack(): void {
    // No previous state from here
  }
}

class AddAssetState implements LinkState {
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
}
