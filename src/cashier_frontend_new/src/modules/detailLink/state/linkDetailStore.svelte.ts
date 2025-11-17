import { managedState } from "$lib/managedState";
import { assertUnreachable } from "$lib/rsMatch";
import { authState } from "$modules/auth/state/auth.svelte";
import { cashierBackendService } from "$modules/links/services/cashierBackend";
import { detailLinkService } from "$modules/detailLink/services/detailLink";
import { type ActionTypeValue } from "$modules/links/types/action/actionType";
import { LinkState } from "$modules/links/types/link/linkState";
import { LinkStep } from "$modules/links/types/linkStep";
import type { LinkDetailState } from "./linkDetailStates";
import { LinkActiveState } from "./linkDetailStates/active";
import { LinkCreatedState } from "./linkDetailStates/created";
import { LinkInactiveState } from "./linkDetailStates/inactive";
import type { LinkAction } from "$modules/links/types/linkAndAction";

/**
 * Store for link detail
 */
export class LinkDetailStore {
  #linkDetailQuery;
  #state: LinkDetailState;
  #id: string;

  constructor({ id }: { id: string }) {
    this.#id = id;
    this.#linkDetailQuery = managedState<LinkAction>({
      queryFn: async () => {
        const linkDetail = await detailLinkService.fetchLinkDetail({
          id,
          anonymous: !authState.isLoggedIn,
        });
        if (linkDetail.isErr()) {
          throw linkDetail.error;
        }
        return linkDetail.value;
      },
      watch: true,
    });
    this.#state = new LinkCreatedState(this);

    $effect(() => {
      const link = this.link;
      if (!link) return;

      // Update state based on link state
      switch (link.state) {
        case LinkState.CREATE_LINK:
          this.#state = new LinkCreatedState(this);
          break;
        case LinkState.ACTIVE:
          this.#state = new LinkActiveState(this);
          break;
        case LinkState.INACTIVE:
          this.#state = new LinkInactiveState(this);
          break;
        case LinkState.INACTIVE_ENDED:
          this.#state = new LinkInactiveState(this);
          break;
        case LinkState.CHOOSING_TYPE:
        case LinkState.ADDING_ASSET:
        case LinkState.PREVIEW:
          throw new Error(`Invalid link state for detail store: ${link.state}`);
        default:
          assertUnreachable(link.state);
      }
    });
  }

  /**
   * Get link detail query
   */
  get query() {
    return this.#linkDetailQuery;
  }

  /**
   * Get link from the query result
   */
  get link() {
    return this.#linkDetailQuery.data?.link;
  }

  /**
   * Get action from the query result
   */
  get action() {
    return this.#linkDetailQuery.data?.action;
  }

  /**
   * Get link detail state
   */
  get state() {
    return this.#state;
  }
  /**
   * Set link detail state
   */
  set state(state: LinkDetailState) {
    this.#state = state;
  }
  /**
   * Get link id
   */
  get id() {
    return this.#id;
  }
  /**
   * Set link id
   */
  set id(id: string) {
    this.#id = id;
  }

  /**
   * Create an action based on the current state
   * @param actionType The type of action to create
   * @returns void
   */
  async createAction(actionType: ActionTypeValue) {
    this.#state.createAction(actionType);
  }

  /**
   * Process the current action in the store
   * @param actionId id of the action to process
   * @returns void
   */
  async processAction(actionId: string) {
    this.#state.processAction(actionId);
  }

  /**
   * Disable the link from active -> inactive state
   * @returns void
   * @throws Error when link is missing or not active and backend call fails
   */
  async disableLink() {
    if (!this.link) {
      throw new Error("Link is missing");
    }

    if (
      this.#state.step !== LinkStep.ACTIVE &&
      this.link.state !== LinkState.ACTIVE
    ) {
      throw new Error("Only active links can be disabled");
    }

    const result = await cashierBackendService.disableLinkV2(this.link.id);

    if (result.isErr()) {
      throw new Error(`Failed to active link: ${result.error}`);
    }

    this.#state = new LinkInactiveState(this);
    this.query.refresh();
  }
}
