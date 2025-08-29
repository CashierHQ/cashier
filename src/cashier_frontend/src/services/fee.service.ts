// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

import { FeeModel } from "@/services/types/intent.service.types";
import { TokenUtilService } from "@/services/tokenUtils.service";
import { convertDecimalBigIntToNumber } from "@/utils";
import { IntentModel } from "@/services/types/intent.service.types";
import {
  AssetInfo as FeeAssetInfo,
  FeeTable,
} from "@/services/types/fee.types";
import {
  DEFAULT_FEE_TABLE,
  createFeeKey,
  ICP_TOKEN_ADDRESS,
  DEFAULT_CREATION_FEE,
} from "./fee.constants";
import { ACTION_TYPE, FEE_TYPE, TASK } from "./types/enum";
import { Chain } from "@/services/types/link.service.types";
import { FungibleToken } from "@/types/fungible-token.speculative";

export type Transfer = {
  intent: IntentModel;
  fee: FeeModel | undefined;
};

export class FeeService {
  private feeTable: FeeTable;

  /**
   * Initialize the FeeService with the default fee table
   * or a custom fee table if provided
   */
  constructor(customFeeTable?: FeeTable) {
    this.feeTable = customFeeTable || DEFAULT_FEE_TABLE;
  }

  /**
   * Get the fee for a specific chain, link type, and fee type
   */
  getFee(
    chain: string,
    linkType: string,
    feeType: string,
  ): FeeAssetInfo | null {
    const key = createFeeKey(chain, linkType, feeType);
    const feeConfig = this.feeTable.get(key);

    if (feeConfig) {
      return feeConfig.asset;
    }

    return null;
  }

  /**
   * Get all fees for a specific chain and link type
   */
  getAllFees(chain: string, linkType: string): FeeAssetInfo[] {
    const fees: FeeAssetInfo[] = [];

    Object.values(FEE_TYPE).forEach((feeType) => {
      const fee = this.getFee(chain, linkType, feeType);
      if (fee) {
        fees.push(fee);
      }
    });

    return fees;
  }

  /**
   * Calculate the total fee in human-readable format for a specific chain and link type
   */
  async calculateTotalFee(chain: string, linkType: string): Promise<number> {
    const fees = this.getAllFees(chain, linkType);
    let totalFee = 0;

    for (const fee of fees) {
      const metadata = await TokenUtilService.getTokenMetadata(fee.address);
      if (metadata) {
        totalFee += convertDecimalBigIntToNumber(fee.amount, metadata.decimals);
      } else if (fee.decimals !== undefined) {
        // Use the fee's own decimals if available
        totalFee += Number(fee.amount) / Math.pow(10, fee.decimals);
      }
    }

    return totalFee;
  }

  /**
   * Get network fee for a specific intent
   */
  async getNetworkFee(intent: IntentModel): Promise<FeeModel | undefined> {
    const meta = await TokenUtilService.getTokenMetadata(intent.typeDetails.asset.address);
    if (!meta) return undefined;

    return {
      address: intent.typeDetails.asset.address,
      chain: intent.typeDetails.asset.chain,
      amount: meta.fee,
      type: "network_fee",
    };
  }

  /**
   * Get network fees for multiple intents
   */
  async getNetworkFeeMap(intents: IntentModel[]): Promise<Transfer[]> {
    return Promise.all(
      intents.map(async (intent) => ({
        intent,
        fee: await this.getNetworkFee(intent),
      })),
    );
  }

  /**
   * Calculate total amount for intents
   */
  async calculateIntentsTotal(intents: IntentModel[]): Promise<number> {
    return this.calculateAmountTotal(
      intents.map((intent) => ({
        address: intent.typeDetails.asset.address,
        amount: intent.typeDetails.amount,
      })),
    );
  }

  /**
   * Calculate total amount for fee models
   */
  async calculateFeeTotal(feeModels: FeeModel[]): Promise<number> {
    return this.calculateAmountTotal(
      feeModels.map((fee) => ({
        address: fee.address,
        amount: fee.amount,
      })),
    );
  }

  /**
   * Unified calculation method for any asset amounts
   */
  private async calculateAmountTotal(
    assets: { address: string; amount: bigint }[],
  ): Promise<number> {
    const displayAmounts = await Promise.all(
      assets.map(async (asset) => {
        const metadata = await TokenUtilService.getTokenMetadata(asset.address);
        return metadata
          ? convertDecimalBigIntToNumber(asset.amount, metadata.decimals)
          : 0;
      }),
    );

    return displayAmounts.reduce((total, amount) => total + amount, 0);
  }

  /**
   * Get link creation fee (from FeeHelpers)
   */
  getLinkCreationFee() {
    return {
      amount: BigInt(DEFAULT_CREATION_FEE),
      decimals: 8,
      symbol: "ICP",
      address: ICP_TOKEN_ADDRESS,
    };
  }

  /**
   * Calculate network fees in normal format (from FeeHelpers)
   */
  calculateNetworkFees(tokenInfo: FungibleToken): number {
    const fee = this.calculateNetworkFeesInBigInt(tokenInfo);
    const decimals = tokenInfo.decimals;

    if (!fee || !decimals) {
      throw new Error("Token fee or decimals not found");
    }
    return convertDecimalBigIntToNumber(fee, decimals);
  }

  /**
   * Calculate network fees in BigInt format (from FeeHelpers)
   */
  calculateNetworkFeesInBigInt(tokenInfo: FungibleToken): bigint {
    console.log("Calculating network fees for token:", tokenInfo);
    switch (tokenInfo.chain) {
      case Chain.IC:
        const fee = tokenInfo.fee;
        if (!fee) {
          throw new Error("Token fee not found");
        }
        return fee;
      default:
        return 0n;
    }
  }

  /**
   * Calculates the total amount needed for a transaction without considering intents.
   * This is used for direct token transfers where we need to account for:
   * - The base token amount multiplied by max actions
   * - Network fees for each action
   * - One additional network fee for the final execution
   *
   * Formula: (amount * maxActions) + (networkFee * maxActions) + networkFee
   *
   * @param tokenInfo - Token information including decimals and fee structure
   * @param amount - link amount per use
   * @param maxActionNumber - Maximum number of actions/uses for this transaction
   * @returns Total amount needed in human-readable format (e.g., 1.5 ICP)
   */
  forecastIcrc1FeeBasedOnAssetInfo(
    tokenInfo: FungibleToken,
    amount: bigint,
    maxActionNumber: number,
  ): number {
    const tokenDecimals = tokenInfo.decimals;

    // Calculate network fee per transaction using BigInt
    const networkFeeBigInt = this.calculateNetworkFeesInBigInt(tokenInfo);

    // Calculate total token amount in smallest units (BigInt arithmetic)
    const totalTokenAmountBigInt = amount * BigInt(maxActionNumber);

    // Total fees for all planned actions (maxActionNumber times) + one execution fee
    const totalFeesBigInt = networkFeeBigInt * BigInt(maxActionNumber + 1);

    // Add token amount and fees, then convert to human-readable format
    const totalBigInt = totalTokenAmountBigInt + totalFeesBigInt;

    // Convert to number with proper decimal handling
    return convertDecimalBigIntToNumber(totalBigInt, tokenDecimals);
  }

  forecastIcrc2Fee(
    tokenInfo: FungibleToken,
    amount: bigint,
    maxActionNumber: number,
  ): number {
    const tokenDecimals = tokenInfo.decimals;
    const totalBigInt = this.forecastIcrc2FeeES8(
      tokenInfo,
      amount,
      maxActionNumber,
    );
    // Convert to number with proper decimal handling
    return convertDecimalBigIntToNumber(totalBigInt, tokenDecimals);
  }

  forecastIcrc2FeeES8(
    tokenInfo: FungibleToken,
    amount: bigint,
    maxActionNumber: number,
  ): bigint {
    const networkFeeBigInt = this.calculateNetworkFeesInBigInt(tokenInfo);

    // Calculate total token amount in smallest units (BigInt arithmetic)
    const totalTokenAmountBigInt = amount * BigInt(maxActionNumber);

    // Calculate total fees (2 network fees: 1 for approve, 1 for transfer)
    const totalFeesBigInt = networkFeeBigInt * BigInt(2);

    // Add token amount and fees, then convert to human-readable format
    const totalBigInt = totalTokenAmountBigInt + totalFeesBigInt;

    // Convert to number with proper decimal handling
    return totalBigInt;
  }

  /**
   * Calculates the total amount needed for a transaction based on link asset info.
   * This is used for direct token transfers where we need to account for:
   * - The base token amount multiplied by max actions
   * - One additional network fee for the final execution
   *
   * ! This method only use for use page
   *
   * Formula: (amount * maxActions) + networkFee
   *
   * @param tokenInfo - Token information including decimals and fee structure
   * @param amount - link amount per use
   * @param maxActionNumber - Maximum number of actions/uses for this transaction
   * @returns Total amount needed in human-readable format (e.g., 1.5 ICP)
   */
  forecastIcrc1InUseLink(
    linkType: string,
    tokenInfo: FungibleToken,
    amount: bigint,
    maxActionNumber: number,
  ): number {
    const tokenDecimals = tokenInfo.decimals;
    const totalBigInt = this.forecastIcrc1InUseLinkUlps(
      linkType,
      tokenInfo,
      amount,
      maxActionNumber,
    );

    return convertDecimalBigIntToNumber(totalBigInt, tokenDecimals);
  }

  forecastIcrc1InUseLinkUlps(
    linkType: string,
    tokenInfo: FungibleToken,
    amount: bigint,
    maxActionNumber: number,
  ): bigint {
    if (linkType === "ReceivePayment") {
      // Calculate network fee per transaction using BigInt
      const networkFeeBigInt = this.calculateNetworkFeesInBigInt(tokenInfo);

      // Calculate total token amount in smallest units (BigInt arithmetic)
      const totalTokenAmountBigInt = amount * BigInt(maxActionNumber);

      // Add one network fee for execution
      const totalBigInt = totalTokenAmountBigInt + networkFeeBigInt;

      // Convert to number with proper decimal handling
      return totalBigInt;
    } else if (linkType === "SendAirdrop") {
      // Calculate total token amount in smallest units (BigInt arithmetic)
      const totalTokenAmountBigInt = amount * BigInt(1);

      // Add one network fee for execution
      const totalBigInt = totalTokenAmountBigInt;

      // Convert to number with proper decimal handling
      return totalBigInt;
    } else {
      // For other link types, just convert token amount
      const totalTokenAmountBigInt = amount * BigInt(maxActionNumber);
      return totalTokenAmountBigInt;
    }
  }

  /**
   * Calculates the actual amount needed for a transaction including the intent.
   *
   * The backend normally calculates intent amounts as:
   * intent_amount = (asset_info.amount + asset_network_fee) * max_use
   *
   * However, real execution requires an additional network fee,
   * so we add one more network fee for accurate user display.
   *
   * @param linkType - The type of link being processed
   * @param actionType - The action being performed (CREATE_LINK, WITHDRAW_LINK, USE_LINK)
   * @param intent - The intent model containing transaction details
   * @param tokenInfo - Token information including decimals and fees
   * @returns The total amount needed including all fees
   */
  forecastIcrcFeeForIntent(
    linkType: string,
    actionType: ACTION_TYPE,
    intent: IntentModel,
    tokenInfo: FungibleToken,
  ) {
    // Use BigInt arithmetic to avoid floating-point precision issues
    const amountBigInt = intent.typeDetails.amount;
    console.log("intent", intent);
    const networkFeeBigInt = this.calculateNetworkFeesInBigInt(tokenInfo);

    let displayAmountBigInt = amountBigInt;

    if (actionType === ACTION_TYPE.CREATE_LINK) {
      displayAmountBigInt = amountBigInt + networkFeeBigInt;
    } else if (actionType === ACTION_TYPE.USE) {
      if (
        linkType === "ReceivePayment" &&
        intent.task === TASK.TRANSFER_WALLET_TO_LINK
      ) {
        displayAmountBigInt = amountBigInt + networkFeeBigInt;
        console.log(
          "Using ReceivePayment link type with transfer task, adding network fee",
          amountBigInt,
          displayAmountBigInt,
        );
      }
    } else if (actionType === ACTION_TYPE.WITHDRAW) {
      // No additional fees for withdraw
    }

    return convertDecimalBigIntToNumber(
      displayAmountBigInt,
      tokenInfo.decimals,
    );
  }

  /**
   * Check if fee should be displayed for intent (from FeeHelpers)
   */
  shouldDisplayFeeBasedOnIntent(
    linkType: string,
    actionType: ACTION_TYPE,
    intentTask: TASK,
  ): boolean {
    if (actionType === ACTION_TYPE.CREATE_LINK) {
      return true;
    } else if (actionType === ACTION_TYPE.WITHDRAW) {
      return true;
    } else if (actionType === ACTION_TYPE.USE) {
      if (
        linkType === "ReceivePayment" &&
        intentTask === TASK.TRANSFER_LINK_TO_WALLET
      ) {
        return false;
      }
    } else {
      return false;
    }

    return false;
  }

  calculateAssetFee() { }
}

// Export a singleton instance for easy use across the app
const feeService = new FeeService();

export const FeeHelpers = {
  getLinkCreationFee: () => feeService.getLinkCreationFee(),
  calculateNetworkFees: (tokenInfo: FungibleToken) =>
    feeService.calculateNetworkFees(tokenInfo),
  calculateNetworkFeesInES8: (tokenInfo: FungibleToken) =>
    feeService.calculateNetworkFeesInBigInt(tokenInfo),
  forecastActualAmountForPreview: (
    tokenInfo: FungibleToken,
    amount: bigint,
    maxActionNumber: number,
  ) =>
    feeService.forecastIcrc1FeeBasedOnAssetInfo(
      tokenInfo,
      amount,
      maxActionNumber,
    ),
  forecastActualAmountForLinkUsePage: (
    linkType: string,
    tokenInfo: FungibleToken,
    amount: bigint,
    maxActionNumber: number,
  ) =>
    feeService.forecastIcrc1InUseLink(
      linkType,
      tokenInfo,
      amount,
      maxActionNumber,
    ),
  forecastIcrcFeeForIntent: (
    linkType: string,
    actionType: ACTION_TYPE,
    intent: IntentModel,
    tokenInfo: FungibleToken,
  ) =>
    feeService.forecastIcrcFeeForIntent(
      linkType,
      actionType,
      intent,
      tokenInfo,
    ),
  forecastIcrc2Fee: (
    tokenInfo: FungibleToken,
    amount: bigint,
    maxActionNumber: number,
  ) => feeService.forecastIcrc2Fee(tokenInfo, amount, maxActionNumber),

  forecastIcrc2FeeEs8: (
    tokenInfo: FungibleToken,
    amount: bigint,
    maxActionNumber: number,
  ) => feeService.forecastIcrc2FeeES8(tokenInfo, amount, maxActionNumber),

  shouldDisplayFeeBasedOnIntent: (
    linkType: string,
    actionType: ACTION_TYPE,
    intentTask: TASK,
  ) =>
    feeService.shouldDisplayFeeBasedOnIntent(linkType, actionType, intentTask),
};
