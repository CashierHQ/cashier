import { managedState } from "$lib/managedState";
import { fromNullable } from "@dfinity/utils";
import { cashierBackendService } from "../services/cashierBackend";
import { ActionMapper } from "../types/action/action";
import {
  ActionType,
  ActionTypeMapper,
  type ActionTypeValue,
} from "../types/action/actionType";
import { Link, LinkMapper } from "../types/link/link";
import { authState } from "$modules/auth/state/auth.svelte";
import { LinkState } from "../types/link/linkState";
import { LinkType } from "../types/link/linkType";
import { assertUnreachable } from "$lib/rsMatch";
import { Err, Ok, type Result } from "ts-results-es";
import type { LinkDetailState } from "./linkDetailStates";
import { LinkCreatedState } from "./linkDetailStates/created";
import { LinkStep } from "$modules/links/types/linkStep";
import { LinkInactiveState } from "./linkDetailStates/inactive";
import { LinkActiveState } from "./linkDetailStates/active";
import type { LinkAndAction } from "../types/linkAndAction";

/**
 * Store for link detail
 */
export class LinkDetailStore {
  /**
   * Determine ActionType based on a Link instance.
   * Moved from top-level helper into the store as a static method.
   */
  static determineActionTypeFromLink(
    initialLink: Link,
  ): ActionTypeValue | undefined {
    if (initialLink.state === LinkState.CREATE_LINK)
      return ActionType.CREATE_LINK;

    if (initialLink.state === LinkState.ACTIVE) {
      switch (initialLink.link_type) {
        case LinkType.TIP:
        case LinkType.TOKEN_BASKET:
        case LinkType.AIRDROP:
          return ActionType.RECEIVE;
        case LinkType.RECEIVE_PAYMENT:
          return ActionType.SEND;
        default:
          return assertUnreachable(initialLink.link_type);
      }
    }

    if (initialLink.state === LinkState.INACTIVE) return ActionType.WITHDRAW;

    return undefined;
  }

  /**
   * Fetch link detail (possibly in two calls) — moved into the store as a static method.
   */
  static async fetchLinkDetail(
    id: string,
    {
      action,
      anonymous,
    }: {
      action?: ActionTypeValue;
      anonymous: boolean;
    },
  ): Promise<Result<LinkAndAction, Error>> {
    try {
      // initial fetch: either with explicit action or without (respecting anonymous)
      const initialResp = action
        ? await cashierBackendService.getLink(id, {
            action_type: ActionTypeMapper.toBackendType(action),
          })
        : await cashierBackendService.getLink(id, undefined, {
            anonymous,
          });

      if (initialResp.isErr()) return Err(initialResp.error);

      const initialLink = LinkMapper.fromBackendType(initialResp.value.link);

      // If an explicit action was requested, return the initial response mapped
      if (action) {
        const actionDto = fromNullable(initialResp.value.action);
        return Ok({
          link: initialLink,
          action: actionDto
            ? ActionMapper.fromBackendType(actionDto)
            : undefined,
        });
      }

      // determine which ActionType (if any) we should fetch alongside the link
      const actionType =
        LinkDetailStore.determineActionTypeFromLink(initialLink);

      if (!actionType) return Ok({ link: initialLink, action: undefined });

      // If the caller requested anonymous access, avoid fetching the action
      // on the second call — actions may require authentication/permission.
      if (anonymous) {
        console.log(
          `Skipping fetching action (action_type=${actionType}) because anonymous=true`,
        );
        return Ok({ link: initialLink, action: undefined });
      }

      console.log(`Fetching link detail with action type: ${actionType}`);

      const getLinkResp = await cashierBackendService.getLink(id, {
        action_type: ActionTypeMapper.toBackendType(actionType),
      });

      if (getLinkResp.isErr()) return Err(getLinkResp.error);

      const res = getLinkResp.unwrap();
      const actionDto = fromNullable(res.action);

      return Ok({
        link: LinkMapper.fromBackendType(res.link),
        action: actionDto ? ActionMapper.fromBackendType(actionDto) : undefined,
      });
    } catch (e) {
      return Err(e as Error);
    }
  }
  #linkDetailQuery;
  #state: LinkDetailState;
  #id: string;

  constructor({ id }: { id: string }) {
    this.#id = id;
    this.#linkDetailQuery = managedState<LinkAndAction>({
      queryFn: async () => {
        const linkDetail = await LinkDetailStore.fetchLinkDetail(id, {
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
