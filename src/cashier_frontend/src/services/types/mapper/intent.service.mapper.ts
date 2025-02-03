import { FeeModel, TransactionModel } from "../intent.service.types";
import { AssetModel, IntentModel } from "@/services/types/refractor.intent.service.types";

// export const mapReceiveModel = (fee: Receive): ReceiveModel => {
//     return {
//         assetAddress: fee.asset_address,
//         assetAmount: fee.asset_amount,
//         chain: fee.chain,
//         name: fee.name,
//         type: fee.type,
//     };
// };

// Mapping between FeeModel -> AssetModel
export const mapFeeModelToAssetModel = (
    fee: FeeModel | undefined,
    transactions: TransactionModel[][] | undefined,
): AssetModel | undefined => {
    if (!fee) {
        return undefined;
    }
    return {
        address: fee.address,
        //amount: fee.amount,
        chain: fee.chain,
        //transaction: getTransactionMapWithTheFeeModel(fee.address, transactions),
    };
};

const getTransactionMapWithTheFeeModel = (
    address: string,
    transactions: TransactionModel[][] | undefined,
) => {
    return transactions?.flat().find((t) => t.canister_id === address);
};

export const toCanisterCallRequest = (tx: TransactionModel) => {
    return {
        canisterId: tx.canister_id,
        method: tx.method,
        arg: tx.arg,
    };
};

export const mapIntentModelToAssetModel = (
    intent: IntentModel | undefined,
    transactions: TransactionModel[][] | undefined,
) => {
    if (!intent) {
        return undefined;
    }
    return {
        address: intent.asset.address,
        amount: intent.amount,
        chain: intent.asset.chain,
        transaction: getTransactionMapWithTheFeeModel(intent.asset.address, transactions),
    };
};
