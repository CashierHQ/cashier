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
import { DEFAULT_FEE_TABLE, createFeeKey } from "./fee.constants";
import { FEE_TYPE } from "./types/enum";

export type Transfer = {
    intent: IntentModel;
    fee: FeeModel | undefined;
};

export abstract class IntentHelperService {
    public static async getNetworkFee(intent: IntentModel): Promise<FeeModel | undefined> {
        const meta = await TokenUtilService.getTokenMetadata(intent.asset.address);

        if (!meta) {
            return undefined;
        }

        return {
            address: intent.asset.address,
            chain: intent.asset.chain,
            amount: meta.fee,
            type: "network_fee",
        };
    }

    public static async getNetworkFeeMap(intents: IntentModel[]): Promise<Transfer[]> {
        return Promise.all(
            intents.map(async (intent) => {
                return {
                    intent,
                    fee: await IntentHelperService.getNetworkFee(intent),
                };
            }),
        );
    }

    public static async calculateTotal(intents: IntentModel[]): Promise<number> {
        const assetDisplayAmounts = await Promise.all(
            intents.map(async (intent) => {
                const metadata = await TokenUtilService.getTokenMetadata(intent.asset.address);

                if (!metadata) {
                    return;
                }

                return convertDecimalBigIntToNumber(intent.amount, metadata.decimals);
            }),
        );

        const totalAssetsDisplayAmount = assetDisplayAmounts.reduce<number>((total, amount) => {
            return total + (amount ?? 0);
        }, 0);

        return totalAssetsDisplayAmount;
    }

    public static async calculateFeeTotal(feeModels: FeeModel[]): Promise<number> {
        const assetDisplayAmounts = await Promise.all(
            feeModels.map(async (feeModel) => {
                const metadata = await TokenUtilService.getTokenMetadata(feeModel.address);

                if (!metadata) {
                    return;
                }

                return convertDecimalBigIntToNumber(feeModel.amount, metadata.decimals);
            }),
        );

        const totalAssetsDisplayAmount = assetDisplayAmounts.reduce<number>((total, amount) => {
            return total + (amount ?? 0);
        }, 0);

        return totalAssetsDisplayAmount;
    }
}

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
}

// Export a singleton instance for easy use across the app
export const feeService = new FeeService();
