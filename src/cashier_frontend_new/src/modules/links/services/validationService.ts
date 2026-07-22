import type { CreateLinkData } from "$modules/creationLink/types/viewModels/genericCreationLinkStoreVM";
import {
  calculateRequiredAssetAmount,
  calculateTotalAssetAmount,
} from "$modules/links/utils/amountCalculator";
import { feeService } from "$modules/shared/services/feeService";
import type { TokenWithPriceAndBalance } from "$modules/token/types";
import { TokenStandard } from "$modules/token/types/tokenStandard";
import {
  type Asset as SharedAsset,
  IntentParticipants as SharedIntentParticipants,
  type Link as SharedLink,
  TokenStandard as SharedTokenStandard,
  calculateIntentFees,
} from "$shared";
import { Err, Ok, type Result } from "ts-results-es";

/**
 * Calculates the fixed network fee required to fund a link asset transfer.
 *
 * This fee is charged once for the link, regardless of the link's max use count.
 *
 * @param tokenStandard - The token standard used by the asset ledger.
 * @param ledgerFee - The ledger transfer fee for the selected asset.
 * @returns The total fixed network fee required for the creator-to-link transfer.
 */
function calculateCreatorToLinkNetworkFee(
  tokenStandard: SharedTokenStandard,
  ledgerFee: bigint,
): bigint {
  const setupFeeMultiplier =
    tokenStandard === SharedTokenStandard.ICRC2 ? 2n : 1n;
  return setupFeeMultiplier * ledgerFee + ledgerFee;
}

class ValidationService {
  /**
   * Validate the required amount of assets for a link creation
   * @param createLinkData
   * @returns Result indicating success or error
   */
  validateRequiredAmount(
    createLinkData: CreateLinkData,
    walletTokens: TokenWithPriceAndBalance[],
  ): Result<boolean, Error> {
    if (!createLinkData.assets || createLinkData.assets.length === 0) {
      return Err(new Error("No assets provided for validation"));
    }

    if (!walletTokens || walletTokens.length === 0) {
      return Err(new Error("Wallet tokens data is not available"));
    }

    const requiredAmountsResult = calculateRequiredAssetAmount(
      createLinkData.assets,
      createLinkData.maxUse,
      walletTokens,
    );

    if (requiredAmountsResult.isErr()) {
      return requiredAmountsResult;
    }

    const requiredAmounts = requiredAmountsResult.unwrap();

    // Validate each asset's current balance against the required amounts
    for (const [address, amount] of Object.entries(requiredAmounts)) {
      const token = walletTokens.find((t) => t.address === address);
      if (!token) {
        return Err(
          new Error(`Token with address ${address} not found in wallet`),
        );
      }

      if (token.balance < amount) {
        return Err(
          new Error(
            `Insufficient amount for asset ${address}, required: ${amount}, available: ${token.balance}`,
          ),
        );
      }
    }

    return Ok(true);
  }

  /**
   * Calculate the total amount for each asset (useAmount * maxUse) without fees
   * This is the exact amount that will be sent, excluding network fees
   * Uses the same calculation logic as calculateRequiredAssetAmount (useAmount * maxUse)
   * @param createLinkData - The link creation data
   * @returns Result containing total amounts (without fees) or error
   */
  totalAssetAmount(
    createLinkData: CreateLinkData,
  ): Result<Record<string, bigint>, Error> {
    if (!createLinkData.assets || createLinkData.assets.length === 0) {
      return Err(new Error("No assets provided for calculation"));
    }

    return calculateTotalAssetAmount(
      createLinkData.assets,
      createLinkData.maxUse,
    );
  }

  /**
   * Validate the required amount of asset for link v3 creation
   * This validation is used in the AddAssetStateV3 to validate the asset details before allowing user to proceed to the preview step
   * @param draftLink
   * @param walletTokens
   * @returns Result indicating success or error
   */
  validateRequiredAssetAmountV3(
    draftLink: SharedLink,
    walletTokens: TokenWithPriceAndBalance[],
  ): Result<boolean, Error> {
    // sanity check to ensure we have the necessary data to perform validation
    if (!draftLink.asset_info || draftLink.asset_info.length === 0) {
      return Err(new Error("No assets provided for validation"));
    }

    if (!walletTokens || walletTokens.length === 0) {
      return Err(new Error("Wallet tokens data is not available"));
    }

    // validate assets amount, cache the result to a hashmap to be use in the edge case later on
    const requiredAssetAmountMap: Record<string, bigint> = {};
    for (const assetInfo of draftLink.asset_info) {
      if (assetInfo.amount <= 0n) {
        return Err(new Error("Asset amount must be greater than zero"));
      }

      const token = walletTokens.find(
        (t) =>
          t.address.toLowerCase() ===
          assetInfo.asset.address.toText().toLowerCase(),
      );
      if (!token) {
        return Err(
          new Error(
            `Token with address ${assetInfo.asset.address.toText()} not found in wallet`,
          ),
        );
      }

      const requiredAmountResult = this.calculateRequiredAssetAmountV3(
        assetInfo.asset,
        assetInfo.amount,
        Number(draftLink.max_use),
      );

      if (requiredAmountResult.isErr()) {
        return Err(
          new Error(
            `Failed to calculate required amount for asset ${assetInfo.asset.address.toText()}: ${requiredAmountResult.error.message}`,
          ),
        );
      }

      const requiredAmount = requiredAmountResult.unwrap();

      if (token.balance < requiredAmount) {
        return Err(
          new Error(
            `Insufficient amount for asset ${assetInfo.asset.address.toText()}, required: ${requiredAmount}, available: ${token.balance}`,
          ),
        );
      }

      requiredAssetAmountMap[assetInfo.asset.address.toText().toLowerCase()] =
        requiredAmount;
    }

    // validate fee amount
    const feeConfig = feeService.getLinkCreationFee();
    const feeAmount = feeConfig.amount;
    const feeToken = walletTokens.find(
      (t) => t.address.toLowerCase() === feeConfig.tokenAddress.toLowerCase(),
    );
    if (!feeToken) {
      return Err(
        new Error(
          `Fee token with address ${feeConfig.tokenAddress} not found in wallet`,
        ),
      );
    }
    const isICRC2 =
      !feeToken.tokenStandards ||
      feeToken.tokenStandards.includes(TokenStandard.ICRC2);

    const requiredFeeAmountResult = this.calculateRequiredFeeAmountV3(
      feeAmount,
      feeToken.fee,
      isICRC2 ? SharedTokenStandard.ICRC2 : SharedTokenStandard.ICRC1,
    );

    if (requiredFeeAmountResult.isErr()) {
      return Err(
        new Error(
          `Failed to calculate required fee amount: ${requiredFeeAmountResult.error.message}`,
        ),
      );
    }

    const requiredFeeAmount = requiredFeeAmountResult.unwrap();

    if (feeToken.balance < requiredFeeAmount) {
      return Err(
        new Error(
          `Insufficient amount for link creation fee, required: ${requiredFeeAmount}, available: ${feeToken.balance}`,
        ),
      );
    }

    // edge case: the fee token also being used as an asset in the link, need to ensure the balance can cover both the fee and the asset amount
    const feeTokenAssetInfo =
      requiredAssetAmountMap[feeConfig.tokenAddress.toLowerCase()];

    if (feeTokenAssetInfo) {
      const totalRequiredAmountForFeeToken =
        requiredFeeAmount + feeTokenAssetInfo - feeToken.fee; // subtract one ledger fee because it is already included in the required fee amount calculation
      if (feeToken.balance < totalRequiredAmountForFeeToken) {
        return Err(
          new Error(
            `Insufficient amount for fee token ${feeConfig.tokenAddress}, required: ${totalRequiredAmountForFeeToken} (including both asset amount and fee), available: ${feeToken.balance}`,
          ),
        );
      }
    }

    return Ok(true);
  }

  /**
   * Calculates the required asset balance for v3 link creation.
   *
   * The asset amount scales with `maxUse`, while the network fee is charged once
   * for the link.
   *
   * @param asset - The asset metadata used to determine token standard and ledger fee.
   * @param amount - The asset amount entered by the user.
   * @param maxUse - The maximum number of times the link can be used.
   * @returns A result containing the required asset balance, including fixed network fees.
   */
  calculateRequiredAssetAmountV3(
    asset: SharedAsset,
    amount: bigint,
    maxUse: number,
  ): Result<bigint, Error> {
    const totalAmount = amount * BigInt(maxUse);
    const networkFee = calculateCreatorToLinkNetworkFee(
      asset.token_standard ?? SharedTokenStandard.ICRC2,
      asset.network_fee ?? 0n,
    );

    return Ok(totalAmount + networkFee);
  }

  /**
   * Calculate the required fee amount for link v3 creation, using the fee calculation logic from shared package
   * @param feeAmount - The base fee amount for link creation
   * @param ledgerFee - The network fee for the asset
   * @param tokenStandard - The token standard of the asset
   * @returns Result containing required fee amount or error
   */
  calculateRequiredFeeAmountV3(
    feeAmount: bigint,
    ledgerFee: bigint,
    tokenStandard: SharedTokenStandard,
  ): Result<bigint, Error> {
    const intentFees = calculateIntentFees({
      intent_participants: SharedIntentParticipants.CreatorToTreasury,
      token_standard: tokenStandard,
      user_input_amount: 0n,
      link_creation_fee: feeAmount,
      asset_network_fee: ledgerFee,
      max_use: 1,
    });
    return Ok(
      BigInt(intentFees.intent_total_amount) +
        BigInt(intentFees.intent_total_network_fee),
    );
  }

  /**
   * Calculates the maximum asset amount that can be entered for v3 link creation.
   *
   * The returned amount is the selected token balance minus fixed link fees. It is
   * not divided by `maxUse`, so the Max button stays based on the user's available
   * balance regardless of the current use count.
   *
   * @param tokenAddress - The selected asset token address.
   * @param maxUse - The maximum number of times the link can be used.
   * @param walletTokens - The wallet token balances used to locate the asset and fee token.
   * @returns A result containing the maximum input amount after fixed fees, or an error.
   */
  calculateMaxAssetAmountV3(
    tokenAddress: string,
    maxUse: number,
    walletTokens: TokenWithPriceAndBalance[],
  ): Result<bigint, Error> {
    if (maxUse <= 0) {
      return Err(new Error("Max use must be greater than zero"));
    }

    const feeConfig = feeService.getLinkCreationFee();
    const feeAmount = feeConfig.amount;
    const feeToken = walletTokens.find(
      (t) => t.address.toLowerCase() === feeConfig.tokenAddress.toLowerCase(),
    );
    if (!feeToken) {
      return Err(
        new Error(
          `Fee token with address ${feeConfig.tokenAddress} not found in wallet`,
        ),
      );
    }

    const feeTokenStandard =
      !feeToken.tokenStandards ||
      feeToken.tokenStandards.includes(TokenStandard.ICRC2)
        ? SharedTokenStandard.ICRC2
        : SharedTokenStandard.ICRC1;

    const isFeeToken =
      tokenAddress.toLowerCase() === feeConfig.tokenAddress.toLowerCase();

    const assetToken = walletTokens.find(
      (t) => t.address.toLowerCase() === tokenAddress.toLowerCase(),
    );
    if (!assetToken) {
      return Err(
        new Error(`Token with address ${tokenAddress} not found in wallet`),
      );
    }

    const tokenStandard =
      !assetToken.tokenStandards ||
      assetToken.tokenStandards.includes(TokenStandard.ICRC2)
        ? SharedTokenStandard.ICRC2
        : SharedTokenStandard.ICRC1;

    const assetNetworkFee = calculateCreatorToLinkNetworkFee(
      tokenStandard,
      assetToken.fee,
    );

    let requiredFeeAmount = 0n;
    if (isFeeToken) {
      const requiredFeeAmountResult = this.calculateRequiredFeeAmountV3(
        feeAmount,
        feeToken.fee,
        feeTokenStandard,
      );

      if (requiredFeeAmountResult.isErr()) {
        return requiredFeeAmountResult;
      }

      requiredFeeAmount = requiredFeeAmountResult.unwrap();
    }

    const overlappingFee = isFeeToken ? assetToken.fee : 0n;
    const availableBalance =
      assetToken.balance - requiredFeeAmount - assetNetworkFee + overlappingFee;
    const maxAssetAmount = availableBalance > 0n ? availableBalance : 0n;

    if (maxAssetAmount < 0n) {
      return Err(new Error("Insufficient balance to cover required fees"));
    }

    return Ok(maxAssetAmount);
  }
}

export const validationService = new ValidationService();
