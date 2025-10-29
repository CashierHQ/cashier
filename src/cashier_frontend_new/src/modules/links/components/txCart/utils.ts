import { parseBalanceUnits } from "$modules/shared/utils/converter";
import { formatNumber } from "$modules/shared/utils/formatNumber";
import { walletStore } from "$modules/token/state/walletStore.svelte";
import {
  AssetProcessState,
  type AssetItem,
  type FeeItem,
  type FeeType,
} from "./type";
import { ActionType } from "$modules/links/types/action/actionType";
import type Action from "$modules/links/types/action/action";
import IntentTask from "$modules/links/types/action/intentTask";

/**
 * Format a raw fee info (from LinkStore.getFeeInfo) into a UI-friendly FeeItem
 */
export function enrichFee(fee: {
  feeType: FeeType;
  amountRaw: bigint;
  address: string;
}): FeeItem {
  const tokenRes = walletStore.findTokenByAddress(fee.address);

  if (tokenRes.isErr()) {
    console.error(
      "Failed to resolve token for fee:",
      fee.address,
      tokenRes.unwrapErr(),
    );
    return {
      feeType: fee.feeType,
      amount: parseBalanceUnits(fee.amountRaw, 8).toString(),
      symbol: "N/A",
    };
  }

  const token = tokenRes.unwrap();

  const unitAmount = parseBalanceUnits(fee.amountRaw, token.decimals);
  const amountStr = formatNumber(unitAmount);
  const usd = token.priceUSD ? unitAmount * token.priceUSD : undefined;
  const usdStr = usd !== undefined ? formatNumber(usd) : undefined;

  return {
    feeType: fee.feeType,
    amount: amountStr,
    symbol: token.symbol,
    price: token.priceUSD,
    usdValue: usd,
    usdValueStr: usdStr,
  };
}

/**
 * map given action to asset items for display
 * get the link info, convert it to asset item
 */
export function mapActionToAssetItems(action: Action): AssetItem[] {
  const getLabel = (intent: Action["intents"][number]) =>
    intent.task === IntentTask.TransferWalletToTreasury
      ? "Create link fee"
      : "";

  return action.intents.map((intent) => {
    const address = intent.type.payload.asset.address.toString();
    const label = getLabel(intent);

    const tokenRes = walletStore.findTokenByAddress(address);
    const id = intent.id +"_"+ address;
    if (tokenRes.isErr()) {
      console.error(
        "Failed to resolve token for asset:",
        address,
        tokenRes.unwrapErr(),
      );
      return {
        id,
        state: AssetProcessState.PENDING,
        label,
        symbol: "N/A",
        address,
        amount: parseBalanceUnits(intent.type.payload.amount, 8).toString(),
        usdValueStr: undefined,
      };
    }

    const token = tokenRes.unwrap();
    const tokenAmount = parseBalanceUnits(
      intent.type.payload.amount,
      token.decimals,
    );
    const usdValue = token.priceUSD ? tokenAmount * token.priceUSD : undefined;

    return {
      id,
      state: AssetProcessState.PENDING,
      label,
      symbol: token.symbol,
      address,
      amount: formatNumber(tokenAmount),
      usdValueStr: usdValue ? formatNumber(usdValue) : undefined,
    };
  });
}

/**
 * Return a user-facing heading string based on an ActionType.
 * Defaults to "You send" when action type is not provided or unrecognized.
 */
export function getHeadingFromActionType(actionType?: ActionType): string {
  if (!actionType) return "You send";
  if (actionType === ActionType.CreateLink) return "You send";
  if (actionType === ActionType.Withdraw || actionType === ActionType.Receive)
    return "You receive";
  return "You send";
}
