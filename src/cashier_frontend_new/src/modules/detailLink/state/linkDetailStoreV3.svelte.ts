import type { GateForUser } from "$lib/generated/cashier_backend/cashier_backend.did";
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
  ActionState as SharedActionState,
  ActionType as SharedActionType,
  LinkState as SharedLinkState,
} from "$shared";
import type Action from "$modules/links/types/action/action";
import { Principal } from "@icp-sdk/core/principal";
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

  /**
   * The current user's pending (not yet successful) action for this link, if any.
   * This is the action to resume via the tx cart. Replaces the old singular
   * `action`, which used to be whichever action the backend happened to return
   * first — now the backend returns all of the user's actions, so "pending" must
   * be derived explicitly rather than assumed.
   */
  get action() {
    if (!this.pendingBackendAction) {
      return undefined;
    }
    return ActionMapper.fromSharedAction(
      this.pendingBackendAction,
      this.icrc112Requests,
    );
  }

  /**
   * All of the current user's actions for this link (not just the pending one).
   */
  get actions(): SharedAction[] {
    return this.#linkDetailQuery.data?.actions ?? [];
  }

  /**
   * The first not-yet-successful action, if any — the one to resume.
   */
  get pendingBackendAction(): SharedAction | undefined {
    return this.actions.find(
      (action) => action.action_state !== SharedActionState.Success,
    );
  }

  /**
   * The owner-flow action for this link (e.g. CreateLink, Withdraw) — these
   * action types only ever have a single action per link, so this prefers the
   * pending one (to process/resume) and falls back to the existing one so
   * owner-flow consumers can still see it once it succeeds.
   */
  get backendAction(): SharedAction | undefined {
    return this.pendingBackendAction ?? this.actions[0];
  }

  /**
   * All of the current user's successfully completed actions for this link.
   */
  get completedActions(): Action[] {
    return this.actions
      .filter((action) => action.action_state === SharedActionState.Success)
      .map((action) => ActionMapper.fromSharedAction(action, undefined));
  }

  /**
   * Get ICRC-112 requests to execute in the TxCart
   */
  get icrc112Requests() {
    return this.#linkDetailQuery.data?.icrc112_requests;
  }

  /**
   * Get gates attached to this link
   */
  get gates(): GateForUser[] {
    return this.#linkDetailQuery.data?.gates ?? [];
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

    await this.query.refreshAsync();
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

    await this.query.refreshAsync();
  }
}
