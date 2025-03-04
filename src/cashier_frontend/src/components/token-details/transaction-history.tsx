import { EmptyHistoryMessage } from "./empty-history-message";
import { TransactionHistoryList } from "./transaction-list";
import { TransactionRecord } from "@/types/transaction-record.speculative";

interface TransactionHistory {
    items: TransactionRecord[] | undefined;
}

export function TransactionHistory({ items }: TransactionHistory) {
    const isEmptyHistory = items && items.length === 0;

    return (
        <div className="flex flex-col items-center gap-2">
            {isEmptyHistory ? (
                <EmptyHistoryMessage />
            ) : (
                <TransactionHistoryList items={items ?? []} />
            )}
        </div>
    );
}
