import { assertUnreachable } from "$lib/rsMatch";
import { authState } from "$modules/auth/state/auth.svelte";
import type Action from "$modules/links/types/action/action";
import type { Link } from "$modules/links/types/link/link";
import {
  LinkState,
  type LinkStateValue,
} from "$modules/links/types/link/linkState";
import { LinkType } from "$modules/links/types/link/linkType";
import { LinkStep } from "$modules/links/types/linkStep";
import TempLink from "$modules/links/types/tempLink";
import { Err, Ok, type Result } from "ts-results-es";
import type { LinkCreationState } from "../../creationLink/state/linkCreationStates";
import { AddAssetState } from "../../creationLink/state/linkCreationStates/addAsset";
import { ChooseLinkTypeState } from "../../creationLink/state/linkCreationStates/chooseLinkType";
import { LinkCreatedState } from "../../creationLink/state/linkCreationStates/created";
import { PreviewState } from "../../creationLink/state/linkCreationStates/preview";
import { AddAssetTipLinkState } from "../../creationLink/state/linkCreationStates/tiplink/addAsset";
import { tempLinkRepository } from "../repositories/tempLinkRepository";
import { CreateLinkData } from "../types/createLinkData";

// Simple reactive state management
export class LinkCreationStore {
  // Private state variables - declare with $state at class level
  #state = $state<LinkCreationState>(new ChooseLinkTypeState(this));
  // draft holds partial data used for creation/edit flows
  public createLinkData = $state<CreateLinkData>(
    new CreateLinkData({
      title: "",
      linkType: LinkType.TIP,
      assets: [],
      maxUse: 1,
    }),
  );

  public link = $state<Link | undefined>();
  // Only existed if the link state == Created
  public action = $state<Action | undefined>();
  #id = $state<string>();

  constructor(tempLink: TempLink) {
    this.#id = tempLink.id;
    this.createLinkData = tempLink.createLinkData;
    this.#state = this.stateFromValue(tempLink.state);
    this.action = undefined;
    this.link = undefined;

    $effect(() => {
      // Access reactive state to track changes
      void this.createLinkData;
      void this.#state;

      // Sync on changes (async, no await needed in effect)
      this.syncTempLink();
    });
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

  set id(id: string) {
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

  /**
   * Pure function derive the initial state based on the given LinkStateValue
   * @param state LinkStateValue to initialize from
   * @returns LinkCreationState corresponding to the given state
   */
  private stateFromValue(state: LinkStateValue): LinkCreationState {
    let initialState: LinkCreationState;

    switch (state) {
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
      default:
        initialState = new ChooseLinkTypeState(this);
    }

    return initialState;
  }

  /**
   * Create and store a new temporary link for the given principal
   * @param principalId owner principal identifier
   * @returns the created TempLink object
   */
  static createTempLink(principalId: string): TempLink {
    const ts = Date.now();
    const tsInNanoSec = BigInt(ts) * 1000000n;
    const id = principalId + "-" + ts.toString();
    const state = LinkState.CHOOSING_TYPE;
    const newCreateLinkData = new CreateLinkData({
      title: "",
      linkType: LinkType.TIP,
      assets: [],
      maxUse: 1,
    });

    const tempLink = new TempLink(id, tsInNanoSec, state, newCreateLinkData);

    tempLinkRepository.create({
      id: id,
      owner: principalId,
      tempLink: tempLink,
    });

    return tempLink;
  }

  /**
   * Get a temporary link by id for the current authenticated user
   * @param id string identifier of the temp link
   * @returns the TempLink object or undefined if not found
   */
  static getTempLink(id: string): Result<TempLink, Error> {
    const owner = authState.account?.owner;
    if (!owner) return Err(new Error("User not authenticated"));
    const tempLink = tempLinkRepository.getOne(owner, id);
    if (!tempLink) {
      return Err(new Error(`Temp link with id ${id} not found`));
    }
    return Ok(tempLink);
  }

  // Sync the temp link with storage: updates it or deletes it if link is created
  syncTempLink(): void {
    if (this.#state.step === LinkStep.CREATED) {
      return;
    }

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
      case LinkStep.ACTIVE:
      case LinkStep.INACTIVE:
      case LinkStep.ENDED:
        throw new Error(
          "LinkCreationStore cannot transition to INACTIVE, or ENDED",
        );
      default:
        assertUnreachable(this.#state.step);
    }

    if (this.#id && currentLinkState && authState.account) {
      tempLinkRepository.update({
        id: this.#id,
        updateTempLink: {
          state: currentLinkState,
          createLinkData: this.createLinkData,
        },
        owner: authState.account.owner,
      });
    }
  }
}
