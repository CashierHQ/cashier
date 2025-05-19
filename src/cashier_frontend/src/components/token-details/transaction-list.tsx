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
    );
}
