import { managedState } from "$lib/managedState";
import { accountState } from "$modules/shared/state/auth.svelte";
import { IcpLedgerService } from "$modules/token/services/icpLedger";
import { tokenPriceService } from "$modules/token/services/tokenPrice";
import { tokenStorageService } from "$modules/token/services/tokenStorage";
import type { TokenWithPriceAndBalance } from "$modules/token/types";
import type { AccountIdentifier } from "@dfinity/ledger-icp";
import { Principal } from "@dfinity/principal";

export class WalletStore {
  #walletTokensQuery;

  constructor() {
    this.#walletTokensQuery = managedState<TokenWithPriceAndBalance[]>({
      queryFn: async () => {
        // fetch list user's tokens
        const tokens = await tokenStorageService.listTokens();
        console.log("fetched tokens:", tokens);

        // fetch token balances
        const balanceRequests = tokens.map((token) => {
          const icpLedgerService = new IcpLedgerService(token);
          return icpLedgerService.getBalance();
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

  async toggleToken(address: Principal, isEnabled: boolean) {
    const toggleRes = await tokenStorageService.toggleToken(address, isEnabled);
    console.log("Toggle token response:", toggleRes);
    // Refresh the wallet tokens data after toggling the token enabled state
    this.#walletTokensQuery.refresh();
  }

  async addToken(address: Principal) {
    const addRes = await tokenStorageService.addToken(address);
    console.log("Add token response:", addRes);
    // Refresh the wallet tokens data after adding a new token
    this.#walletTokensQuery.refresh();
  }

  async transferTokenByPrincipal(token: string, to: Principal, amount: bigint) {
    const tokenData = this.findTokenByAddress(token);
    const icpLedgerService = new IcpLedgerService(tokenData);
    const transferRes = await icpLedgerService.transferByPrincipal(to, amount);
    console.log("Transfer token response:", transferRes);
    // Refresh the wallet tokens data after sending tokens
    this.#walletTokensQuery.refresh();
  }

  async transferTokenByAccount(
    token: string,
    to: AccountIdentifier,
    amount: bigint,
  ) {
    const tokenData = this.findTokenByAddress(token);
    const icpLedgerService = new IcpLedgerService(tokenData);
    const transferRes = await icpLedgerService.transferByAccount(to, amount);
    console.log("Transfer token response:", transferRes);
    // Refresh the wallet tokens data after sending tokens
    this.#walletTokensQuery.refresh();
  }

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
