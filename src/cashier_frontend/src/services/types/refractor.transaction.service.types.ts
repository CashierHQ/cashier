import { IC_TRANSACTION_PROTOCAL, TRANSACTION_STATE, WALLET } from "./enum";
import { AssetModel, WalletModel } from "./refractor.intent.service.types";

export type RefactoredTransactionModel = {
    id: string;
    wallet: WALLET;
    protocol: IC_TRANSACTION_PROTOCAL;
    from: WalletModel;
    to: WalletModel;
    asset: AssetModel;
    amount: bigint;
    state: TRANSACTION_STATE;
};
