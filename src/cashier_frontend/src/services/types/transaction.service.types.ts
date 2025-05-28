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
