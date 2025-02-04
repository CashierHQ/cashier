import { TASK, CHAIN, INTENT_STATE, INTENT_TYPE } from "./enum";
import { TransactionModel } from "./refractor.transaction.service.types";

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
    type: INTENT_TYPE;
    from: WalletModel;
    to: WalletModel;
    asset: AssetModel;
    amount: bigint;
};
