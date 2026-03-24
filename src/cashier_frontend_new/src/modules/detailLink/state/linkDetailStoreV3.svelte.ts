import { managedState } from "$lib/managedState";
import { assertUnreachable } from "$lib/rsMatch";
import { actionTemplateLoader } from "$modules/actionTemplate/services/actionTemplateLoader";
import { authState } from "$modules/auth/state/auth.svelte";
import { detailLinkService } from "$modules/detailLink/services/detailLink";
import type { LinkDetailStateV3 } from "$modules/detailLink/state/linkDetailStatesV3";
import { LinkActiveStateV3 } from "$modules/detailLink/state/linkDetailStatesV3/active";
import { LinkCreatedStateV3 } from "$modules/detailLink/state/linkDetailStatesV3/created";
import { LinkEndedStateV3 } from "$modules/detailLink/state/linkDetailStatesV3/ended";
import { LinkInactiveStateV3 } from "$modules/detailLink/state/linkDetailStatesV3/inactive";
import type { CreateActionResponseV3 } from "$modules/detailLink/types/dto/create_action_v3";
import type { ProcessActionResponseV3 } from "$modules/detailLink/types/dto/process_action_v3";
import { type LinkActionV3 } from "$modules/detailLink/types/v3/link_action";
import { cashierBackendService } from "$modules/links/services/cashierBackend";
import { ActionMapper } from "$modules/links/types/action/action";
import { LinkMapper } from "$modules/links/types/link/link";
import type { Action as SharedAction } from "$shared";
import {
  ActionType as SharedActionType,
  LinkState as SharedLinkState,
} from "$shared";
import { Principal } from "@dfinity/principal";
import { Err, Ok, Result } from "ts-results-es";

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
   * Initialize the withdraw action from template
   */
  getDraftingAction(actionType: SharedActionType): Result<SharedAction, Error> {
    if (this.sharedLink && authState.account?.owner) {
      const actionResult = actionTemplateLoader.createActionFromTemplate(
        this.sharedLink?.link_type,
        actionType,
        Principal.fromText(authState.account.owner),
      );

      if (actionResult.isOk()) {
        return Ok(actionResult.unwrap());
      } else {
        return Err(
          new Error(
            `Failed to create withdraw action from template: ${actionResult.error}`,
          ),
        );
      }
    } else {
      return Err(new Error("User must be authenticated to create action"));
    }
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
    if (!this.#linkDetailQuery.data?.link) {
      return undefined;
    }
    return LinkMapper.fromSharedLink(this.#linkDetailQuery.data?.link);
  }

  get sharedLink() {
    return this.#linkDetailQuery.data?.link;
  }

  get action() {
    if (!this.backendAction) {
      return undefined;
    }
    return ActionMapper.fromSharedAction(
      this.backendAction,
      this.icrc112Requests,
    );
  }

  /**
   * Get action from the query result
   */
  get backendAction() {
    return this.#linkDetailQuery.data?.action;
  }

  /**
   * Get ICRC-112 requests to execute in the TxCart
   */
  get icrc112Requests() {
    return this.#linkDetailQuery.data?.icrc112_requests;
  }

  /**
   * Get state handler based on the link state
   */
  get state(): LinkDetailStateV3 {
    const link = this.sharedLink;
    if (!link) {
      throw new Error("Link is missing");
    }

    switch (link.link_state) {
      case SharedLinkState.Created:
        return new LinkCreatedStateV3(this);
      case SharedLinkState.Active:
        return new LinkActiveStateV3();
      case SharedLinkState.Inactive:
        return new LinkInactiveStateV3(this);
      case SharedLinkState.Ended:
        return new LinkEndedStateV3();
      case SharedLinkState.ChooseType:
      case SharedLinkState.AddAsset:
      case SharedLinkState.Preview:
        throw new Error(
          `Link in state ${link.link_state} should not be handled in LinkDetailStoreV3`,
        );
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
  async createAction(
    actionType: SharedActionType,
  ): Promise<CreateActionResponseV3> {
    return this.state.createAction(actionType);
  }

  /**
   * Process the current action in the store
   * @returns The result of processing the action
   */
  async processAction(): Promise<ProcessActionResponseV3> {
    return this.state.processAction();
  }

  /**
   * Sync the asset balance cache for the link by querying actual token balances from the ledger.
   * @returns void
   * @throws Error when link is missing or backend call fails
   */
  async syncAssetBalanceCache() {
    if (!this.sharedLink) {
      throw new Error("Link is missing");
    }

    const result = await cashierBackendService.syncAssetBalanceCacheV3(
      this.sharedLink.id,
    );
    if (result.isErr()) {
      throw new Error(`Failed to sync asset balance cache: ${result.error}`);
    }

    this.query.refresh();
  }

  /**
   * Disable the link from active -> inactive state
   * @returns void
   * @throws Error when link is missing or not active and backend call fails
   */
  async disableLink() {
    if (!this.sharedLink) {
      throw new Error("Link is missing");
    }

    if (this.sharedLink.link_state !== SharedLinkState.Active) {
      throw new Error("Only active links can be disabled");
    }

    const result = await cashierBackendService.disableLinkV3(
      this.sharedLink.id,
    );
    if (result.isErr()) {
      throw new Error(`Failed to active link: ${result.error}`);
    }

    this.query.refresh();
  }
}
