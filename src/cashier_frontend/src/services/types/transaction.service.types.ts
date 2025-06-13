// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

import { IC_TRANSACTION_PROTOCAL, TRANSACTION_STATE, WALLET } from "./enum";
import { AssetModel, WalletModel } from "./intent.service.types";

export type TransactionModel = {
    id: string;
    wallet: WALLET;
    protocol: IC_TRANSACTION_PROTOCAL;
    from: WalletModel;
    to: WalletModel;
    asset: AssetModel;
    amount: bigint;
    state: TRANSACTION_STATE;
};

export type Icrc112RequestModel = {
    arg: string;
    method: string;
    canisterId: string;
    nonce?: string;
};
