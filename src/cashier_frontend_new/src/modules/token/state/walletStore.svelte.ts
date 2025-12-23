import { managedState } from "$lib/managedState";
import { authState } from "$modules/auth/state/auth.svelte";
import {
  encodeAccountID,
  icpLedgerService,
} from "$modules/token/services/icpLedger";
import { IcrcLedgerService } from "$modules/token/services/icrcLedger";
import { tokenStorageService } from "$modules/token/services/tokenStorage";
import type {
  TokenMetadata,
  TokenWithPriceAndBalance,
} from "$modules/token/types";
import { Principal } from "@dfinity/principal";
import { Err, Ok, type Result } from "ts-results-es";
import { ICP_LEDGER_CANISTER_ID } from "../constants";
import { sortWalletTokens } from "../utils/sorter";
import { tokenPriceStore } from "./tokenPriceStore.svelte";
import type { ManagedState } from "$lib/managedState/managedState.svelte";

/**
 * WalletStore manages user's token list with optimized balance fetching.
 *
 * Architecture:
 * - allTokensQuery: Fetches ALL tokens metadata (60s interval, no balances)
 * - enabledTokens: Derived filtered list of enabled tokens
 * - enabledTokensWithBalances: Enabled tokens with balances (15s refresh)
 *
 * Performance: Only fetches balances for enabled tokens (~10-20) instead of all (~200-300)
 */
class WalletStore {
  // Layer 1: All tokens metadata (no balances) - 60s refresh
  #allTokensQuery: ManagedState<TokenMetadata[]>;

  // Layer 2: Enabled tokens with balances + prices - 15s refresh
  #enabledTokensWithBalances = $state<TokenWithPriceAndBalance[]>([]);
  #balanceLoading = $state(false);
  #balanceError = $state<unknown>();

  // AbortController for cancelling in-flight balance requests
  #balanceAbortController: AbortController | null = null;

  constructor() {
    // Initialize allTokensQuery - metadata only, 60s refresh
    this.#allTokensQuery = managedState<TokenMetadata[]>({
      queryFn: async () => tokenStorageService.listTokens(),
      refetchInterval: 60_000,
      persistedKey: ["allTokensQuery"],
      storageType: "localStorage",
    });

    $effect.root(() => {
      // Auth state effect - reset on logout, refresh on login
      $effect(() => {
        if (authState.account == null) {
          this.#allTokensQuery.reset();
          this.#enabledTokensWithBalances = [];
          return;
        }
        this.#allTokensQuery.refresh();
      });

      // Balance fetch effect - triggered when enabledTokens changes
      $effect(() => {
        const enabled = this.#enabledTokens;
        if (enabled.length > 0 && authState.account) {
          this.#fetchBalancesForEnabled();
        }
      });

      // Price update effect - refetch balances when prices update
      $effect(() => {
        const prices = tokenPriceStore.query.data;
        if (prices && this.#enabledTokens.length > 0 && authState.account) {
          this.#fetchBalancesForEnabled();
        }
      });

      // Setup balance polling (15s)
      const balanceInterval = setInterval(() => {
        if (this.#enabledTokens.length > 0 && authState.account) {
          this.#fetchBalancesForEnabled();
        }
      }, 15_000);

      // Cleanup function (returned from $effect.root)
      return () => {
        clearInterval(balanceInterval);
        this.#balanceAbortController?.abort();
      };
    });
  }

  /**
   * Derived enabled tokens from allTokensQuery - auto-updates when source changes
   */
  get #enabledTokens(): TokenMetadata[] {
    return (this.#allTokensQuery.data ?? []).filter(
      (t: TokenMetadata) => t.enabled,
    );
  }

  /**
   * Fetch balances only for enabled tokens.
   * Cancels any in-flight requests to prevent race conditions.
   */
  async #fetchBalancesForEnabled(): Promise<void> {
    const tokens = this.#enabledTokens;
    if (!tokens.length) {
      this.#enabledTokensWithBalances = [];
      return;
    }

    // Cancel any in-flight request to prevent race conditions
    this.#balanceAbortController?.abort();
    this.#balanceAbortController = new AbortController();
    const { signal } = this.#balanceAbortController;

    this.#balanceLoading = true;
    this.#balanceError = undefined;

    try {
      // Fetch balances for enabled tokens only
      const balances = await Promise.all(
        tokens.map((token) => {
          if (token.address === ICP_LEDGER_CANISTER_ID) {
            return icpLedgerService.getBalance();
          }
          return new IcrcLedgerService(token).getBalance();
        }),
      );

      // Check if request was aborted during fetch
      if (signal.aborted) return;

      // Get prices
      const prices = tokenPriceStore.query.data ?? {};

      // Enrich tokens with balances and prices
      this.#enabledTokensWithBalances = sortWalletTokens(
        tokens.map((token, i) => ({
          ...token,
          balance: balances[i],
          priceUSD: prices[token.address] || 0,
        })),
      );
    } catch (error) {
      // Ignore abort errors
      if (error instanceof Error && error.name === "AbortError") return;
      this.#balanceError = error;
    } finally {
      if (!signal.aborted) {
        this.#balanceLoading = false;
      }
    }
  }

  /**
   * Primary query getter (backward compatible) - returns enabled tokens with balances
   */
  get query() {
    // Return object with arrow functions to capture `this` context
    return {
      data: this.#enabledTokensWithBalances,
      isLoading: this.#balanceLoading,
      error: this.#balanceError,
      isSuccess: !this.#balanceLoading && !this.#balanceError,
      refresh: () => this.#fetchBalancesForEnabled(),
      reset: () => {
        this.#enabledTokensWithBalances = [];
        this.#balanceError = undefined;
      },
    };
  }

  /**
   * Access all tokens metadata (for token management UI)
   */
  get allTokensQuery(): ManagedState<TokenMetadata[]> {
    console.log("allTokensQuery", this.#allTokensQuery.data);
    return this.#allTokensQuery;
  }

  /**
   * Toggle token enabled/disabled state
   * @param address Token canister ID
   * @param isEnabled New enabled state
   */
  async toggleToken(address: string, isEnabled: boolean) {
    const token = Principal.fromText(address);
    const toggleRes = await tokenStorageService.toggleToken(token, isEnabled);
    // Refresh allTokens to update enabled status
    // enabledTokens will auto-update via getter, balance effect will trigger
    this.#allTokensQuery.refresh();
    return toggleRes;
  }

  /**
   * Add a new token to the wallet
   * @param address Token canister ID
   */
  async addToken(address: string) {
    const token = Principal.fromText(address);
    const addRes = await tokenStorageService.addToken(token);
    // Refresh allTokens to include new token
    this.#allTokensQuery.refresh();
    return addRes;
  }

  /**
   * Transfer ICRC tokens to another principal
   * @param token Token canister ID
   * @param to Principal of recipient
   * @param amount Amount of tokens to transfer
   */
  async transferTokenToPrincipal(token: string, to: Principal, amount: bigint) {
    const tokenData = this.findTokenByAddress(token).unwrap();
    const icrcLedgerService = new IcrcLedgerService(tokenData);
    const transferRes = await icrcLedgerService.transferToPrincipal(to, amount);
    // Refresh balances after transfer
    this.#fetchBalancesForEnabled();
    return transferRes;
  }

  /**
   * Transfer ICP token to account
   * @param to Account identifier of the recipient
   * @param amount Amount of tokens to transfer
   */
  async transferICPToAccount(to: string, amount: bigint) {
    const transferRes = await icpLedgerService.transferToAccount(to, amount);
    // Refresh balances after transfer
    this.#fetchBalancesForEnabled();
    return transferRes;
  }

  /**
   * Get the ICP AccountID (legacy) for the current auth user
   * @returns The ICP account ID of the current user, or null if not available.
   */
  icpAccountID(): string | null {
    if (!authState.account) {
      return null;
    }

    try {
      const principal = Principal.fromText(authState.account.owner);
      return encodeAccountID(principal);
    } catch (error) {
      console.error("Error encoding ICP accountID:", error);
      return null;
    }
  }

  /**
   * Find a token by its address.
   * First checks enabled tokens (has balance), then falls back to all tokens.
   * @param address Token canister ID string
   * @returns The token full data.
   */
  findTokenByAddress(address: string): Result<TokenWithPriceAndBalance, Error> {
    // First check enabledTokensWithBalances (has balance data)
    const enriched = this.#enabledTokensWithBalances.find(
      (t) => t.address === address,
    );
    if (enriched) {
      return Ok(enriched);
    }

    // Fallback to allTokens (no balance, construct with default)
    const metadata = this.#allTokensQuery.data?.find(
      (t: TokenMetadata) => t.address === address,
    );
    if (metadata) {
      return Ok({
        ...metadata,
        balance: 0n,
        priceUSD: tokenPriceStore.query.data?.[address] || 0,
      });
    }

    return Err(new Error("Token not found"));
  }
}

export const walletStore = new WalletStore();
