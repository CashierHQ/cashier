import type { Action } from "$modules/links/types/action/action";
import { walletStore } from "$modules/token/state/walletStore.svelte";
import { parseBalanceUnits } from "$modules/token/utils/converter";

// State to hold enriched intents for display in ActionDrawer
export type EnrichedIntent = {
  formatedAmount: string;
  feeType: string;
  tokenSymbol: string;
  tokenLogo: string;
};

// State structure for enriched intents
export type EnrichedIntentResult = {
  enrichedIntents: EnrichedIntent[];
};

/**
 * function to enrich action intents with formatted amounts and metadata
 * @param action - The action containing intents to enrich
 * @returns Enriched intents with formatted amounts and fee breakdown
 */
export function enrichIntents(action: Action): EnrichedIntentResult {
  if (!action?.intents || !walletStore.query.data) {
    return {
      enrichedIntents: [],
    };
  }

  const enrichedIntents = action.intents
    .filter(intent => intent.type?.payload)
    .map(intent => {
      const payload = intent.type.payload;
      const amount = intent.type.payload?.amount;
      const assetAddress = payload.asset.address.toString();
      const tokenMeta = walletStore.query.data?.find(token => token.address === assetAddress) || null;
      
      // Fallback to defaults if token not found in wallet
      const symbol = tokenMeta?.symbol || "UNKNOWN";
      const decimals = tokenMeta?.decimals || 8;
      const amountValue = parseBalanceUnits(amount, decimals);

      // Format the amount nicely
      let formatedAmount: string;
      if (amountValue >= 1) {
        formatedAmount = amountValue.toFixed(5);
      } else if (amountValue >= 0.01) {
        formatedAmount = amountValue.toFixed(5);
      } else {
        formatedAmount = amountValue.toFixed(6).replace(/0+$/, "").replace(/\.$/, "");
      }

      const feeType = intent.task.match({
    TransferWalletToTreasury: () => "Link creation fee",
    TransferWalletToLink: () => "",
    TransferLinkToWallet: () => "", 
  });
      
      return {
        formatedAmount,
        feeType,
        tokenSymbol: symbol,
        tokenLogo: "", // TODO: Add token logo support
      };
    });

  return {
    enrichedIntents,
  };
}
