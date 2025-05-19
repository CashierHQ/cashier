// Cashier — No-code blockchain transaction builder
// Copyright (C) 2025 TheCashierApp LLC
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with this program.  If not, see <https://www.gnu.org/licenses/>.

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
    from: WalletModel;
    to: WalletModel;
    asset: AssetModel;
    amount: bigint;
    createdAt: Date;
};

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
    transactions?: TransactionModel[][];
};

export type FeeModel = {
    chain: string;
    type: string;
    address: string;
    amount: bigint;
};
