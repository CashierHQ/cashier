import { IC_TRANSACTION_PROTOCAL, TRANSACTION_STATE, Wallet } from "./enum";
import { AssetModel, WalletModel } from "./refractor.intent.service.types";

export type TransactionModel = {
    id: string;
    wallet: Wallet;
    protocol: IC_TRANSACTION_PROTOCAL;
    from: WalletModel;
    to: WalletModel;
    asset: AssetModel;
    amount: bigint;
    state: TRANSACTION_STATE;
};
