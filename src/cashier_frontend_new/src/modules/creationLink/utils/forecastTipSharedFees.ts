import type { CreateLinkAsset } from "$modules/creationLink/types/createLinkData";
import { FeeType } from "$modules/links/types/fee";
import type { ForecastAssetAndFee } from "$modules/shared/types/feeService";
import { parseBalanceUnits } from "$modules/shared/utils/converter";
import {
  formatNumber,
  formatUsdAmount,
} from "$modules/shared/utils/formatNumber";
import {
  ICP_LEDGER_CANISTER_ID,
  ICP_LEDGER_FEE,
} from "$modules/token/constants";
import type { TokenWithPriceAndBalance } from "$modules/token/types";
import {
  calculateIntentFees,
  IntentParticipants,
  TokenStandard as SharedTokenStandard,
} from "$shared";

/**
 * Forecast link creation fees for TIP_SHARED_TEST using the shared fee-calculations.ts logic.
 *
 * This helper is intentionally isolated from the legacy fee logic used by other link types.
 * It relies solely on the shared package (calculateIntentFees + schemas) so that
 * frontend and backend stay in sync for this template.
 */
export function forecastTipSharedFees(
  linkAssets: Array<CreateLinkAsset>,
  maxUse: number,
  tokens: Record<string, TokenWithPriceAndBalance>,
): ForecastAssetAndFee[] {
  const pairs: ForecastAssetAndFee[] = [];

  // 1. Per‑asset CreatorToLink intents
  for (const assetData of linkAssets) {
    const token = tokens[assetData.address];

    if (!token) {
      console.error(
        "Failed to resolve token for asset (TIP_SHARED_TEST shared):",
        assetData.address,
      );
      continue;
    }

    const tokenFee = token.fee ?? ICP_LEDGER_FEE;
    const tokenStandard =
      assetData.address === ICP_LEDGER_CANISTER_ID
        ? SharedTokenStandard.ICRC2
        : SharedTokenStandard.ICRC1;

    // Shared package: CreatorToLink
    const creatorToLinkFees = calculateIntentFees({
      intent_participants: IntentParticipants.CreatorToLink,
      token_standard: tokenStandard,
      user_input_amount: assetData.useAmount,
      max_use: maxUse,
      asset_network_fee: tokenFee,
    });

    const totalAmount = BigInt(creatorToLinkFees.intent_total_amount);
    const totalNetworkFees = BigInt(creatorToLinkFees.intent_total_network_fee);

    // Creator sends
    const totalSentByCreator = totalAmount + totalNetworkFees;
    const totalSentUi = parseBalanceUnits(totalSentByCreator, token.decimals);
    const totalSentUsd = token.priceUSD
      ? totalSentUi * token.priceUSD
      : undefined;

    const totalNetworkFeesUi = parseBalanceUnits(
      totalNetworkFees,
      token.decimals,
    );
    const totalNetworkFeesUsd = token.priceUSD
      ? totalNetworkFeesUi * token.priceUSD
      : undefined;

    pairs.push({
      asset: {
        label: "", // no special label in generic preview
        symbol: token.symbol,
        address: assetData.address,
        amount: formatNumber(totalSentUi),
        usdValueStr: totalSentUsd ? formatUsdAmount(totalSentUsd) : undefined,
      },
      fee: {
        amount: totalNetworkFees,
        feeType: FeeType.NETWORK_FEE,
        amountFormattedStr: formatNumber(totalNetworkFeesUi),
        symbol: token.symbol,
        price: token.priceUSD,
        usdValue: totalNetworkFeesUsd,
        usdValueStr: totalNetworkFeesUsd
          ? formatUsdAmount(totalNetworkFeesUsd)
          : undefined,
      },
    });
  }

  // 2. Link creation fee via CreatorToTreasury intent
  const linkFeeInfo = {
    amount: 10_000n, // 0.0001 ICP in e8s – keep in sync with shared rules
    tokenAddress: ICP_LEDGER_CANISTER_ID,
  };
  const linkFeeToken = tokens[linkFeeInfo.tokenAddress];

  if (linkFeeToken) {
    const tokenFee = linkFeeToken.fee ?? ICP_LEDGER_FEE;

    const treasuryFees = calculateIntentFees({
      intent_participants: IntentParticipants.CreatorToTreasury,
      token_standard: SharedTokenStandard.ICRC2,
      link_creation_fee: linkFeeInfo.amount,
      asset_network_fee: tokenFee,
    });

    const userFee = BigInt(treasuryFees.intent_user_fee);

    const linkFeeFormatted = parseBalanceUnits(userFee, linkFeeToken.decimals);
    const linkFeeUsd = linkFeeToken.priceUSD
      ? linkFeeFormatted * linkFeeToken.priceUSD
      : undefined;

    pairs.push({
      asset: {
        label: "Create link fee",
        symbol: linkFeeToken.symbol,
        address: linkFeeInfo.tokenAddress,
        amount: formatNumber(linkFeeFormatted),
        usdValueStr: linkFeeUsd ? formatUsdAmount(linkFeeUsd) : undefined,
      },
      fee: {
        amount: userFee,
        feeType: FeeType.CREATE_LINK_FEE,
        amountFormattedStr: formatNumber(linkFeeFormatted),
        symbol: linkFeeToken.symbol,
        price: linkFeeToken.priceUSD,
        usdValue: linkFeeUsd,
        usdValueStr: linkFeeUsd ? formatUsdAmount(linkFeeUsd) : undefined,
      },
    });
  }

  return pairs;
}
