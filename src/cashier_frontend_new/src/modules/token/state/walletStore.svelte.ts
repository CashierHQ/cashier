import { managedState } from "$lib/managedState";
import { accountState } from "$modules/shared/state/auth.svelte";
import { icpLedgerService } from "$modules/token/services/icpLedger";
import { IcrcLedgerService } from "$modules/token/services/icrcLedger";
import { tokenPriceService } from "$modules/token/services/tokenPrice";
import { tokenStorageService } from "$modules/token/services/tokenStorage";
import type { TokenWithPriceAndBalance } from "$modules/token/types";
import { Principal } from "@dfinity/principal";

export class WalletStore {
  #walletTokensQuery;

  constructor() {
    this.#walletTokensQuery = managedState<TokenWithPriceAndBalance[]>({
      queryFn: async () => {
        // fetch list user's tokens
        const tokens = await tokenStorageService.listTokens();

        // fetch token balances
        const balanceRequests = tokens.map((token) => {
          const icrcLedgerService = new IcrcLedgerService(token);
          return icrcLedgerService.getBalance();
        });
        const balances: bigint[] = await Promise.all(balanceRequests);

        // fetch token prices
        const prices = await tokenPriceService.getTokenPrices();

        const enrichedTokens = tokens.map((token, index) => ({
          ...token,
          balance: balances[index],
          priceUSD: prices[token.address] || 0,
        }));

        // sort by address
        enrichedTokens.sort((a, b) => a.address.localeCompare(b.address));

        return enrichedTokens;
      },
      refetchInterval: 15_000, // Refresh every 15 seconds to keep balances up-to-date
      persistedKey: ["walletTokensQuery"],
      storageType: "localStorage",
    });

    $effect.root(() => {
      $effect(() => {
        console.log(
          "Account state changed, refreshing tokens...",
          $state.snapshot(accountState.account),
        );
        // Reset the wallet tokens data when user logs out
        if (accountState.account == null) {
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
    const tokenData = this.findTokenByAddress(token);
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
   * Find a token by its address.
   * @param address Token canister ID string
   * @returns The token full data.
   */
  findTokenByAddress(address: string): TokenWithPriceAndBalance {
    if (!this.#walletTokensQuery.data) {
      throw new Error("Wallet tokens data is not loaded");
    }

    const tokenData = this.#walletTokensQuery.data.find(
      (t) => t.address === address,
    );
    if (!tokenData) {
      throw new Error("Token not found in wallet");
    }
    return tokenData;
  }
}

export const walletStore = new WalletStore();
