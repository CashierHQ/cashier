import { AssetModel } from "@/components/transaction-item";
import { Receive } from "../../../../../declarations/cashier_backend/cashier_backend.did";
import { FeeModel, ReceiveModel } from "../intent.service.types";
import { LINK_ASSET_TYPE } from "../enum";

export const mapReceiveModel = (fee: Receive): ReceiveModel => {
    return {
        assetAddress: fee.asset_address,
        assetAmount: fee.asset_amount,
        chain: fee.chain,
        name: fee.name,
        type: fee.type,
    };
};

// Mapping between FeeModel -> AssetModel
export const mapFeeModelToAssetModel = (fee: FeeModel | undefined): AssetModel | undefined => {
    if (!fee) {
        return undefined;
    }
    return {
        address: fee.address,
        amount: fee.amount,
        chain: fee.chain,
        type:
            fee.type === LINK_ASSET_TYPE.CASHIER_FEE
                ? LINK_ASSET_TYPE.CASHIER_FEE
                : LINK_ASSET_TYPE.ASSET_ADDED,
    };
};
