import { AssetModel } from "@/components/transaction-item";
import { FeeModel } from "@/services/types/intent.service.types";
import { TokenUtilService } from "@/services/tokenUtils.service";
import { mapFeeModelToAssetModel } from "@/services/types/mapper/intent.service.mapper";
import { convertDecimalBigIntToNumber } from "@/utils";

export type Transfer = {
    asset: AssetModel | undefined;
    fee: AssetModel | undefined;
};

export abstract class FeeService {
    public static async calculateTotal(assets: AssetModel[]): Promise<number> {
        const assetDisplayAmounts = await Promise.all(
            assets.map(async (asset) => {
                const metadata = await TokenUtilService.getTokenMetadata(asset.address);

                if (!metadata) {
                    return;
                }

                return convertDecimalBigIntToNumber(asset.amount, metadata.decimals);
            }),
        );

        const totalAssetsDisplayAmount = assetDisplayAmounts.reduce<number>((total, amount) => {
            return total + (amount ?? 0);
        }, 0);

        return totalAssetsDisplayAmount;
    }

    public static async getTransfers(assets: FeeModel[]): Promise<Transfer[]> {
        const transfers = await Promise.all(
            assets.map<Promise<Transfer | undefined>>(async (feeModel) => {
                const metadata = await TokenUtilService.getTokenMetadata(feeModel.address);

                if (metadata) {
                    const asset = mapFeeModelToAssetModel(feeModel, undefined);

                    const fee: AssetModel = {
                        address: feeModel.address,
                        amount: metadata.fee,
                        chain: feeModel.chain,
                    };

                    return {
                        asset,
                        fee,
                    };
                }
            }),
        );

        return transfers.filter((transfer) => transfer) as Transfer[];
    }

    public static async groupFeesByAddress(assets: (AssetModel | undefined)[]) {
        const assetMap = new Map<string, AssetModel>();

        assets.forEach((asset) => {
            if (asset) {
                const existingFee = assetMap.get(asset.address);

                if (existingFee) {
                    existingFee.amount += asset.amount;
                } else {
                    assetMap.set(asset.address, { ...asset });
                }
            }
        });

        return Array.from(assetMap.values());
    }
}
