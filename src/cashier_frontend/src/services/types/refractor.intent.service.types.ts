import { TASK, CHAIN, INTENT_STATE } from "./enum";
import { RefactoredTransactionModel } from "./refractor.transaction.service.types";

export type AssetModel = {
    address: string;
    chain: string;
};

export type WalletModel = {
    chain: string;
    address: string;
};

export type IntentModel = {
    id: string;
    task: TASK;
    chain: CHAIN;
    state: INTENT_STATE;
    from: WalletModel;
    to: WalletModel;
    asset: AssetModel;
    amount: bigint;
    transactions: RefactoredTransactionModel[];
};
