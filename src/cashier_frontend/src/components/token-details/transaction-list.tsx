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
