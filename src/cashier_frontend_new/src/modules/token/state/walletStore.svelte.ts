import { managedState } from "$lib/managedState";
import { authState } from "$modules/auth/state/auth.svelte";
import {
  encodeAccountID,
  icpLedgerService,
} from "$modules/token/services/icpLedger";
import { IcrcLedgerService } from "$modules/token/services/icrcLedger";
import { tokenPriceService } from "$modules/token/services/tokenPrice";
import { tokenStorageService } from "$modules/token/services/tokenStorage";
import type { TokenWithPriceAndBalance } from "$modules/token/types";
import { Principal } from "@dfinity/principal";
import { Err, Ok, type Result } from "ts-results-es";
import { ICP_LEDGER_CANISTER_ID } from "../constants";
import { sortWalletTokens } from "../utils/sorter";

export class WalletStore {
  #walletTokensQuery;

  constructor() {
    this.#walletTokensQuery = managedState<TokenWithPriceAndBalance[]>({
      queryFn: async () => {
        // fetch list user's tokens
        const tokens = await tokenStorageService.listTokens();

        // fetch token balances
        const balanceRequests = tokens.map((token) => {
          if (token.address === ICP_LEDGER_CANISTER_ID) {
            return icpLedgerService.getBalance();
          } else {
            const icrcLedgerService = new IcrcLedgerService(token);
            return icrcLedgerService.getBalance();
          }
        });
        const balances: bigint[] = await Promise.all(balanceRequests);

        // fetch token prices
        const prices = await tokenPriceService.getTokenPrices();

        const enrichedTokens = tokens.map((token, index) => ({
          ...token,
          balance: balances[index],
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
        console.log(
          "Account state changed, refreshing tokens...",
          $state.snapshot(authState.account),
        );
        // Reset the wallet tokens data when user logs out
        if (authState.account == null) {
          this.#walletTokensQuery.reset();
          return;
        }
        // Refresh the wallet tokens data when user logs in
        this.#walletTokensQuery.refresh();
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
   * Add a new token to the wallet
   * @param address Token canister ID
   */
  async addToken(address: string) {
    const token = Principal.fromText(address);
    const addRes = await tokenStorageService.addToken(token);
    // Refresh the wallet tokens data after adding a new token
    this.#walletTokensQuery.refresh();
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
