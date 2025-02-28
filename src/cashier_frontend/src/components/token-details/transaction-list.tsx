import History from "@/components/ui/transaction-history";
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

export function groupTransactionsByDate(
    transactions: TransactionRecord[],
): { date: string; transactions: TransactionRecord[] }[] {
    const transactionMap = transactions.reduce((acc, transaction) => {
        const dateKey = new Date(
            transaction.createdAt.getFullYear(),
            transaction.createdAt.getMonth(),
            transaction.createdAt.getDate(),
        ).toISOString();

        if (!acc.has(dateKey)) {
            acc.set(dateKey, []);
        }
        acc.get(dateKey)!.push(transaction);

        return acc;
    }, new Map<string, TransactionRecord[]>());

    return Array.from(transactionMap, ([date, transactions]) => ({ date, transactions }));
}
