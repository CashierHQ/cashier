// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

import History from "@/components/ui/transaction-history";
import { groupTransactionsByDate } from "@/services/transactionHistoryService/transactionHistoryService";
import { TransactionRecord } from "@/types/transaction-record.speculative";
import React from "react";

export interface TransactionHistoryListProps {
    items: TransactionRecord[];
}

export function TransactionHistoryList({ items }: TransactionHistoryListProps) {
    const groupedRecords = groupTransactionsByDate(items);

    return (
        <div className="w-full">
            <History.Root>
                {groupedRecords.map(({ date, transactions }) => (
                    <React.Fragment key={date}>
                        <History.Timestamp date={new Date(date)} />
                        {transactions.map((tx) => (
                            <History.Item key={tx.id} record={tx} />
                        ))}
                    </React.Fragment>
                ))}
            </History.Root>
        </div>
    );
}
