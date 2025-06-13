// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

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
