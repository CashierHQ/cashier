export type IntentCreateModel = {
    id: string;
    state: string;
    link_id: string;
    creator_id: string;
    intent_type: string;
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
