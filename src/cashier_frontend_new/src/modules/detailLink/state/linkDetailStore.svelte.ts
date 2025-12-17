import { managedState } from "$lib/managedState";
import { assertUnreachable } from "$lib/rsMatch";
import { authState } from "$modules/auth/state/auth.svelte";
import { detailLinkService } from "$modules/detailLink/services/detailLink";
import { linkAssetBalanceService } from "$modules/detailLink/services/linkAssetBalance.service";
import type { AssetBalance } from "$modules/detailLink/types/balanceTypes";
import { cashierBackendService } from "$modules/links/services/cashierBackend";
import type Action from "$modules/links/types/action/action";
import type { ProcessActionResult } from "$modules/links/types/action/action";
import { type ActionTypeValue } from "$modules/links/types/action/actionType";
import { LinkState } from "$modules/links/types/link/linkState";
import { type LinkAction } from "$modules/links/types/linkAndAction";
import { walletStore } from "$modules/token/state/walletStore.svelte";
import { parseBalanceUnits } from "$modules/shared/utils/converter";
import { formatNumber } from "$modules/shared/utils/formatNumber";
import { getTokenLogo } from "$modules/shared/utils/getTokenLogo";
import type { LinkDetailState } from "./linkDetailStates";
import { LinkActiveState } from "./linkDetailStates/active";
import { LinkCreatedState } from "./linkDetailStates/created";
import { LinkInactiveState } from "./linkDetailStates/inactive";

/**
 * Store for created link state management
 */
export class LinkDetailStore {
  #linkDetailQuery;
  #balancesQuery;
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

    // Balance query - refetches when link data changes
    this.#balancesQuery = managedState<AssetBalance[]>({
      queryFn: async () => {
        const link = this.link;
        if (!link) return [];
        const assets = link.asset_info.map((info) => info.asset);
        const result = await linkAssetBalanceService.fetchAssetBalances(
          this.#id,
          assets,
        );
        if (result.isErr()) throw result.error;

        // Enrich balances with token metadata
        return result.value.map((item): AssetBalance => {
          const address = item.asset.address?.toString();
          if (!address) {
            return {
              ...item,
              formattedBalance: "-",
              symbol: "?",
              logo: "",
              usdValue: 0,
            };
          }
          const tokenResult = walletStore.findTokenByAddress(address);
          if (tokenResult.isErr()) {
            return {
              ...item,
              formattedBalance: "-",
              symbol: "?",
              logo: getTokenLogo(address),
              usdValue: 0,
            };
          }
          const token = tokenResult.value;
          const parsed = parseBalanceUnits(item.balance, token.decimals);
          const usdValue = token.priceUSD ? parsed * token.priceUSD : 0;
          return {
            ...item,
            formattedBalance: formatNumber(parsed),
            symbol: token.symbol,
            logo: getTokenLogo(address),
            usdValue,
          };
        });
      },
      watch: () => this.link,
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
   * Get state handler based on the link state
   */
  get state(): LinkDetailState {
    const link = this.link;
    if (!link) {
      throw new Error("Link is missing");
    }

    switch (link.state) {
      case LinkState.CREATE_LINK:
        return new LinkCreatedState(this);
      case LinkState.ACTIVE:
        return new LinkActiveState(this);
      case LinkState.INACTIVE:
        return new LinkInactiveState(this);
      case LinkState.INACTIVE_ENDED:
        return new LinkInactiveState(this);
      case LinkState.CHOOSING_TYPE:
      case LinkState.ADDING_ASSET:
      case LinkState.PREVIEW:
        throw new Error(`Invalid link state for detail store: ${link.state}`);
      default:
        assertUnreachable(link.state);
    }
  }

  /**
   * Get link id
   */
  get id() {
    return this.#id;
  }

  /**
   * Get balances query for direct access to loading/error states
   */
  get balancesQuery() {
    return this.#balancesQuery;
  }

  /**
   * Get asset balances for the link
   */
  get balances(): AssetBalance[] {
    return this.#balancesQuery.data ?? [];
  }

  /**
   * Check if balances are loading
   */
  get balancesLoading(): boolean {
    return this.#balancesQuery.isLoading;
  }

  /**
   * Get balance fetch error if any
   */
  get balancesError(): unknown {
    return this.#balancesQuery.error;
  }

  /**
   * Refresh asset balances
   */
  refreshBalances(): void {
    this.#balancesQuery.refresh();
  }

  /**
   * Create an action based on the current state
   * @param actionType The type of action to create
   * @returns The action created
   */
  async createAction(actionType: ActionTypeValue): Promise<Action> {
    return this.state.createAction(actionType);
  }

  /**
   * Process the current action in the store
   * @returns The result of processing the action
   */
  async processAction(): Promise<ProcessActionResult> {
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

    if (this.link.state !== LinkState.ACTIVE) {
      throw new Error("Only active links can be disabled");
    }

    const result = await cashierBackendService.disableLinkV2(this.link.id);
    if (result.isErr()) {
      throw new Error(`Failed to active link: ${result.error}`);
    }

    this.query.refresh();
  }
}
