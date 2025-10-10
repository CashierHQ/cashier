import type Action from "../types/action/action";
import type { TipLink } from "../types/createLinkData";
import { LinkType } from "../types/linkType";
import type { LinkState } from "./linkStates";
import { ChooseLinkTypeState } from "./linkStates/chooseLinkType";

// Simple reactive state management
export class LinkStore {
  // Private state variables
  #state: LinkState;
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

  // Loop through all intents in the action and show their properties
  showAllIntentProperties(): void {
    if (!this.action) {
      console.log("No action available");
      return;
    }

    console.log(`Action ID: ${this.action.id}`);
    console.log(`Total intents: ${this.action.intents.length}`);

    this.action.intents.forEach((intent, index) => {
      console.log(`\n--- Intent ${index + 1} ---`);
      console.log(`ID: ${intent.id}`);
      console.log(`Task:`, intent.task);
      console.log(`Type:`, intent.type);
      console.log(`Created At: ${intent.created_at}`);
      console.log(`State:`, intent.state);
    });
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
}
