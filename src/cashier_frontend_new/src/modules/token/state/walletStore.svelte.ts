import { managedState } from "$lib/managedState";
import { authState } from "$modules/auth/state/auth.svelte";
import type { ValidationErrorType } from "$modules/token/services/canister-validation";
import { icpLedgerService } from "$modules/token/services/icpLedger";
import { IcrcLedgerService } from "$modules/token/services/icrcLedger";
import { tokenStorageService } from "$modules/token/services/tokenStorage";
import type { TokenWithPriceAndBalance } from "$modules/token/types";
import { Principal } from "@dfinity/principal";
import { Err, Ok, type Result } from "ts-results-es";
import { ICP_LEDGER_CANISTER_ID } from "../constants";
import { sortWalletTokens } from "../utils/sorter";
import { tokenPriceStore } from "./tokenPriceStore.svelte";
import { encodeAccountID } from "$modules/shared/utils/icpAccountId";

class WalletStore {
  #walletTokensQuery;

  constructor() {
    this.#walletTokensQuery = managedState<TokenWithPriceAndBalance[]>({
      queryFn: async () => {
        // fetch list user's tokens (only enabled tokens)
        const tokens = await tokenStorageService.listTokens();

        // fetch token balances only for enabled tokens
        const balanceRequests = tokens
          .filter((token) => token.enabled)
          .map((token) => {
            if (token.address === ICP_LEDGER_CANISTER_ID) {
              return icpLedgerService.getBalance();
            } else {
              const icrcLedgerService = new IcrcLedgerService(token);
              return icrcLedgerService.getBalance();
            }
          });
        const balances: bigint[] = await Promise.all(balanceRequests);

        // fetch token prices
        const prices = tokenPriceStore.query.data
          ? tokenPriceStore.query.data
          : {};

        const enrichedTokens = tokens.map((token, index) => ({
          ...token,
          balance: balances[index] ?? 0n,
          priceUSD: prices[token.address] || 0,
        }));

        return sortWalletTokens(enrichedTokens);
      },
      refetchInterval: 15_000, // Refresh every 15 seconds to keep balances up-to-date
      persistedKey: ["walletTokensQuery"],
      storageType: "localStorage",
    });

    $effect.root(() => {
      $effect(() => {
        // Reset the wallet tokens data when user logs out
        if (authState.account == null) {
          this.#walletTokensQuery.reset();
          return;
        }
        // Refresh the wallet tokens data when user logs in
        this.#walletTokensQuery.refresh();
      });

      // Refresh wallet tokens when token prices are updated
      $effect(() => {
        // Read tokenPriceStore.query.data to create reactive dependency
        // This ensures the effect runs when prices are updated
        const prices = tokenPriceStore.query.data;
        if (prices) {
          this.#walletTokensQuery.refresh();
        }
      });
    });
  }

  get query() {
    return this.#walletTokensQuery;
  }

  /**
   * Toggle token enabled/disabled state
   * @param address Token canister ID
   * @param isEnabled
   */
  async toggleToken(address: string, isEnabled: boolean) {
    const token = Principal.fromText(address);
    const toggleRes = await tokenStorageService.toggleToken(token, isEnabled);
    // Refresh the wallet tokens data after toggling the token enabled state
    this.#walletTokensQuery.refresh();
    return toggleRes;
  }

  /**
   * Add a new token to the wallet with validation
   * @param address Token canister ID
   * @param indexId Optional index canister ID for the token
   * @returns Result with void on success or ValidationError on failure
   */
  async addToken(
    address: string,
    indexId?: string,
  ): Promise<Result<void, ValidationErrorType>> {
    const token = Principal.fromText(address);

    // Get existing token addresses for duplicate check
    const existingTokens =
      this.#walletTokensQuery.data?.map((t) => t.address) ?? [];

    const result = await tokenStorageService.addToken(
      token,
      indexId,
      existingTokens,
    );

    if (result.isOk()) {
      // Refresh the wallet tokens data after adding a new token
      this.#walletTokensQuery.refresh();
    }

    return result;
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
    // Refresh the wallet tokens data after sending tokens
    this.#walletTokensQuery.refresh();
    return transferRes;
  }

  /**
   * Transfer ICP token to account
   * @param to Account identifier of the recipient
   * @param amount Amount of tokens to transfer
   */
  async transferICPToAccount(to: string, amount: bigint) {
    const transferRes = await icpLedgerService.transferToAccount(to, amount);
    // Refresh the wallet tokens data after sending tokens
    this.#walletTokensQuery.refresh();
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
   * @param address Token canister ID string
   * @returns The token full data.
   */
  findTokenByAddress(address: string): Result<TokenWithPriceAndBalance, Error> {
    if (!this.#walletTokensQuery.data) {
      return Err(new Error("Wallet tokens data is not loaded"));
    }
    const tokenData = this.#walletTokensQuery.data.find(
      (t) => t.address === address,
    );
    if (!tokenData) {
      return Err(new Error("Token not found"));
    }
    return Ok(tokenData);
  }
}

export const walletStore = new WalletStore();
