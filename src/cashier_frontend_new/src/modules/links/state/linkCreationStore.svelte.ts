import { assertUnreachable } from "$lib/rsMatch";
import { authState } from "$modules/auth/state/auth.svelte";
import tempLinkService from "../services/tempLinkService";
import type Action from "../types/action/action";
import { CreateLinkData } from "../types/createLinkData";
import type { Link } from "../types/link/link";
import type { LinkCreationState } from "./linkCreationStates";
import { ChooseLinkTypeState } from "./linkCreationStates/chooseLinkType";
import { LinkCreatedState } from "./linkCreationStates/created";
import { AddAssetState } from "./linkCreationStates/addAsset";
import { AddAssetTipLinkState } from "./linkCreationStates/tiplink/addAsset";
import { PreviewState } from "./linkCreationStates/preview";
import { LinkType } from "../types/link/linkType";
import { LinkState, type LinkStateValue } from "../types/link/linkState";
import { LinkStep } from "../types/linkStep";
import type TempLink from "../types/tempLink";
import { LinkActiveState } from "./linkCreationStates/active";

// Simple reactive state management
export class LinkCreationStore {
  // Private state variables
  #state: LinkCreationState;

  // draft holds partial data used for creation/edit flows
  public createLinkData: CreateLinkData;

  // Only existed if the link state == Created
  public link?: Link;
  // Only existed if the link state == Created
  public action?: Action;
  #id?: string;

  constructor(temp: TempLink) {
    this.#id = $state<string | undefined>(temp?.id);
    // initialize createLinkData with temp data if provided, otherwise a sensible default
    this.createLinkData = $state<CreateLinkData>(
      temp?.createLinkData ??
        new CreateLinkData({
          title: "",
          linkType: LinkType.TIP,
          assets: [],
          maxUse: 1,
        }),
    );

    // initialize the state based on temp.state (if present) so the UI resumes where the user left off
    const tempState = temp?.state;
    // create a non-reactive initial state instance first (must be top-level for $state assignment)
    let initialState: LinkCreationState;
    switch (tempState) {
      case LinkState.CHOOSING_TYPE:
        initialState = new ChooseLinkTypeState(this);
        break;
      case LinkState.ADDING_ASSET:
        // choose the correct add-asset state depending on the link type
        if (this.createLinkData.linkType === LinkType.TIP) {
          initialState = new AddAssetTipLinkState(this);
        } else {
          initialState = new AddAssetState(this);
        }
        break;
      case LinkState.PREVIEW:
        initialState = new PreviewState(this);
        break;
      case LinkState.CREATE_LINK:
        initialState = new LinkCreatedState(this);
        break;
      case LinkState.ACTIVE:
        initialState = new LinkActiveState(this);
        break;
      default:
        initialState = new ChooseLinkTypeState(this);
    }

    // first (top-level) $state assignment for the private #state field
    this.#state = $state<LinkCreationState>(initialState);
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
      await this.persistTempState();
    } catch (e) {
      if (e instanceof Error) throw e;
      throw new Error(String(e ?? "rejected promise"));
    }
  }

  // Move to the previous state
  async goBack(): Promise<void> {
    try {
      console.log("LinkCreationStore: going back from step", this.#state.step);
      await this.#state.goBack();
      await this.persistTempState();
    } catch (e) {
      if (e instanceof Error) throw e;
      throw new Error(String(e ?? "rejected promise"));
    }
  }

  // Persist the current #state.step into the temp link store
  private async persistTempState(): Promise<void> {
    let currentLinkState: LinkStateValue;

    switch (this.#state.step) {
      case LinkStep.CHOOSE_TYPE:
        currentLinkState = LinkState.CHOOSING_TYPE;
        break;
      case LinkStep.ADD_ASSET:
        currentLinkState = LinkState.ADDING_ASSET;
        break;
      case LinkStep.PREVIEW:
        currentLinkState = LinkState.PREVIEW;
        break;
      case LinkStep.CREATED:
        currentLinkState = LinkState.CREATE_LINK;
        break;
      case LinkStep.ACTIVE:
      case LinkStep.INACTIVE:
      case LinkStep.ENDED:
        throw new Error(
          "LinkCreationStore cannot transition to ACTIVE, INACTIVE, or ENDED",
        );
      default:
        assertUnreachable(this.#state.step);
    }

    console.log("Updating temp link state to", currentLinkState);
    if (this.#id && currentLinkState && authState.account) {
      console.log(
        `Updating temp link ${this.#id} to state ${currentLinkState}`,
      );
      await tempLinkService.update(
        this.#id,
        {
          state: currentLinkState,
          createLinkData: this.createLinkData,
        },
        authState.account.owner,
      );
    }
  }
}
