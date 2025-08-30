// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

import { TASK, CHAIN, INTENT_STATE, INTENT_TYPE } from "./enum";

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
  typeDetails: TransferDataModel | TransferFromDataModel;
};

// Front-end friendly representations of backend Intent transfer payloads
export type TransferDataModel = {
  to: WalletModel;
  asset: AssetModel;
  from: WalletModel;
  amount: bigint;
};

export type TransferFromDataModel = {
  to: WalletModel;
  asset: AssetModel;
  from: WalletModel;
  // optional actual amount after fees
  actual_amount?: bigint;
  amount: bigint;
  // optional approve amount used for ERC20-style transferFrom flows
  approve_amount?: bigint;
  spender?: WalletModel;
};

type TransactionModel = {
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
  transactions?: TransactionModel[][];
};

export type FeeModel = {
  chain: string;
  type: string;
  address: string;
  amount: bigint;
};
