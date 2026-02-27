import { managedState } from "$lib/managedState";
import { assertUnreachable } from "$lib/rsMatch";
import { authState } from "$modules/auth/state/auth.svelte";
import { detailLinkService } from "$modules/detailLink/services/detailLink";
import type { LinkDetailStateV3 } from "$modules/detailLink/state/linkDetailStatesV3";
import { LinkActiveStateV3 } from "$modules/detailLink/state/linkDetailStatesV3/active";
import { LinkCreatedStateV3 } from "$modules/detailLink/state/linkDetailStatesV3/created";
import { LinkEndedStateV3 } from "$modules/detailLink/state/linkDetailStatesV3/ended";
import { LinkInactiveStateV3 } from "$modules/detailLink/state/linkDetailStatesV3/inactive";
import type {
  CreateActionResultV3,
  ProcessActionResultV3,
} from "$modules/detailLink/types/v3/action";
import { type LinkActionV3 } from "$modules/detailLink/types/v3/link_action";
import { cashierBackendService } from "$modules/links/services/cashierBackend";
import type { Action as SharedAction } from "$shared";
import { LinkState as SharedLinkState } from "$shared";

/**
 * Store for created link state management
 */
export class LinkDetailStoreV3 {
  #linkDetailQuery;
  #id: string;

  constructor({ id }: { id: string }) {
    this.#id = id;
    this.#linkDetailQuery = managedState<LinkActionV3>({
      queryFn: async () => {
        const linkDetailV3 = await detailLinkService.fetchLinkDetailV3({
          id,
          anonymous: !authState.isLoggedIn,
        });
        if (linkDetailV3.isErr()) {
          throw linkDetailV3.error;
        }
        return linkDetailV3.value;
      },
      watch: true,
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

  get icrc112Requests() {
    return this.#linkDetailQuery.data?.icrc112_requests;
  }

  /**
   * Get state handler based on the link state
   */
  get state(): LinkDetailStateV3 {
    const link = this.link;
    if (!link) {
      throw new Error("Link is missing");
    }

    switch (link.link_state) {
      case SharedLinkState.Created:
        return new LinkCreatedStateV3(this);
      case SharedLinkState.Active:
        return new LinkActiveStateV3(this);
      case SharedLinkState.Inactive:
        return new LinkInactiveStateV3(this);
      case SharedLinkState.Ended:
        return new LinkEndedStateV3(this);
      default:
        assertUnreachable(link.link_state);
    }
  }

  /**
   * Get link id
   */
  get id() {
    return this.#id;
  }

  /**
   * Create an action based on the current state
   * @param actionType The type of action to create
   * @returns The action created
   */
  async createAction(action: SharedAction): Promise<CreateActionResultV3> {
    return this.state.createAction(action);
  }

  /**
   * Process the current action in the store
   * @returns The result of processing the action
   */
  async processAction(): Promise<ProcessActionResultV3> {
    return this.state.processAction();
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

    if (this.link.link_state !== SharedLinkState.Active) {
      throw new Error("Only active links can be disabled");
    }

    const result = await cashierBackendService.disableLinkV2(this.link.id);
    if (result.isErr()) {
      throw new Error(`Failed to active link: ${result.error}`);
    }

    this.query.refresh();
  }
}
