// Cashier — No-code blockchain transaction builder
// Copyright (C) 2025 TheCashierApp LLC
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with this program.  If not, see <https://www.gnu.org/licenses/>.

import { FeeModel } from "@/services/types/intent.service.types";
import { TokenUtilService } from "@/services/tokenUtils.service";
import { convertDecimalBigIntToNumber } from "@/utils";
import { IntentModel } from "@/services/types/intent.service.types";
import { AssetInfo as FeeAssetInfo, FeeTable } from "@/services/types/fee.types";
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
    getFee(chain: string, linkType: string, feeType: string): FeeAssetInfo | null {
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
        const meta = await TokenUtilService.getTokenMetadata(intent.asset.address);
        if (!meta) return undefined;

        return {
            address: intent.asset.address,
            chain: intent.asset.chain,
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
                address: intent.asset.address,
                amount: intent.amount,
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
                return metadata ? convertDecimalBigIntToNumber(asset.amount, metadata.decimals) : 0;
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
     * Get display amount including fees (from FeeHelpers)
     */
    getDisplayAmount(tokenInfo: FungibleToken, amount: bigint, maxActionNumber: number): number {
        const tokenDecimals = tokenInfo.decimals;
        // only add network fee, intent already included for top up the link
        const totalFeeAmount = this.calculateNetworkFees(tokenInfo) * maxActionNumber;
        const totalTokenAmount = (Number(amount) * maxActionNumber) / 10 ** tokenDecimals;
        return totalTokenAmount + totalFeeAmount;
    }

    /**
     * Check if fee should be displayed for intent (from FeeHelpers)
     */
    shouldDisplayFeeBasedOnIntent(
        linkType: string,
        actionType: ACTION_TYPE,
        intentTask: TASK,
    ): boolean {
        // if use action for link type "receive payment", tx must + 1 fee
        if (
            linkType === "ReceivePayment" &&
            actionType === ACTION_TYPE.USE_LINK &&
            intentTask === TASK.TRANSFER_WALLET_TO_LINK
        ) {
            return true;
        }

        // if createlink action for with intent TRANSFER_LINK_TO_WALLET, tx must + 1 fee
        if (
            linkType === "CreateLink" &&
            actionType === ACTION_TYPE.CREATE_LINK &&
            intentTask === TASK.TRANSFER_WALLET_TO_LINK
        ) {
            return true;
        }

        if (
            linkType === "CreateLink" &&
            actionType === ACTION_TYPE.CREATE_LINK &&
            intentTask === TASK.TRANSFER_WALLET_TO_TREASURY
        ) {
            return true;
        }

        return false;
    }

    calculateAssetFee() {}
}

// Export a singleton instance for easy use across the app
export const feeService = new FeeService();

// Backward compatibility exports
export const IntentHelperService = {
    getNetworkFee: (intent: IntentModel) => feeService.getNetworkFee(intent),
    getNetworkFeeMap: (intents: IntentModel[]) => feeService.getNetworkFeeMap(intents),
    calculateTotal: (intents: IntentModel[]) => feeService.calculateIntentsTotal(intents),
    calculateFeeTotal: (feeModels: FeeModel[]) => feeService.calculateFeeTotal(feeModels),
};

export const FeeHelpers = {
    getLinkCreationFee: () => feeService.getLinkCreationFee(),
    calculateNetworkFees: (tokenInfo: FungibleToken) => feeService.calculateNetworkFees(tokenInfo),
    calculateNetworkFeesInES8: (tokenInfo: FungibleToken) =>
        feeService.calculateNetworkFeesInBigInt(tokenInfo),
    getDisplayAmount: (tokenInfo: FungibleToken, amount: bigint, maxActionNumber: number) =>
        feeService.getDisplayAmount(tokenInfo, amount, maxActionNumber),
    shouldDisplayFeeBasedOnIntent: (linkType: string, actionType: ACTION_TYPE, intentTask: TASK) =>
        feeService.shouldDisplayFeeBasedOnIntent(linkType, actionType, intentTask),
};
