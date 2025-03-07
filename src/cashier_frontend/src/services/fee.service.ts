import { FeeModel } from "@/services/types/intent.service.types";
import { TokenUtilService } from "@/services/tokenUtils.service";
import { convertDecimalBigIntToNumber } from "@/utils";
import { IntentModel } from "@/services/types/intent.service.types";

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
