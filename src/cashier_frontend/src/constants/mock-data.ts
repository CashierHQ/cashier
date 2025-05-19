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
import { TransactionType } from "@/types/transaction-type";
import { TransactionRecord } from "@/types/transaction-record.speculative";
import { CHAIN, FEE_TYPE } from "@/services/types/enum";
import { FeeModel } from "@/services/types/intent.service.types";
import { convertTokenAmountToNumber } from "@/utils";

export const MOCK_TX_DATA: TransactionRecord[] = [
    {
        id: "1",
        chain: Chain.IC,
        type: TransactionType.Send,
        from: { address: "my-wallet", chain: Chain.IC },
        to: { address: "other-wallet", chain: Chain.IC },
        asset: { address: "asset-address", chain: Chain.IC },
        amount: 1.5,
        usdEquivalent: 4500,
        createdAt: new Date("2024-02-25T12:00:00Z"),
    },
    {
        id: "2",
        chain: Chain.IC,
        type: TransactionType.Receive,
        from: { address: "other-wallet", chain: Chain.IC },
        to: { address: "my-wallet", chain: Chain.IC },
        asset: { address: "asset-address", chain: Chain.IC },
        amount: 60,
        usdEquivalent: 65.33,
        createdAt: new Date("2024-02-25T15:30:00Z"),
    },
    {
        id: "3",
        chain: Chain.IC,
        type: TransactionType.Send,
        from: { address: "my-wallet", chain: Chain.IC },
        to: { address: "other-wallet", chain: Chain.IC },
        asset: { address: "asset-address", chain: Chain.IC },
        amount: 0.1,
        usdEquivalent: 5000,
        createdAt: new Date("2024-02-26T09:45:00Z"),
    },
];
