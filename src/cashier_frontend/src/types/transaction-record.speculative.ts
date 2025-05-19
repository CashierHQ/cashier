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

import { Chain } from "@/services/types/link.service.types";
import { TransactionType } from "./transaction-type";
import { AssetModel, WalletModel } from "@/services/types/intent.service.types";

export type TransactionRecord = {
    id: string;
    chain: Chain;
    type: TransactionType;
    from: WalletModel;
    to: WalletModel;
    asset: AssetModel;
    amount: number; // TODO: change to BigNumber bignumber.js lib
    usdEquivalent: number; // TODO: change to BigNumber bignumber.js lib
    createdAt: Date;
};
