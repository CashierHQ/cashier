export type TransactionModel = {
    id: string;
    arg: string;
    method: string;
    canister_id: string;
    state: string;
};

export type IntentCreateModel = {
    id: string;
    state: string;
    link_id: string;
    creator_id: string;
    intent_type: string;
    transactions?: TransactionModel[];
};

export type FeeModel = {
    chain: string;
    type: string;
    address: string;
    amount: bigint;
};

export type ReceiveModel = {
    assetAddress: string[];
    chain: string;
    name: string;
    type: string;
    assetAmount: bigint[];
};

export type CreateIntentConsentModel = {
    fee: FeeModel[];
    send: FeeModel[];
    receive: ReceiveModel[];
};
