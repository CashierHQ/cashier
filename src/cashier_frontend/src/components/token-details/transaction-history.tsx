import { EmptyHistoryMessage } from "./empty-history-message";
import { TransactionHistoryList } from "./transaction-list";

export function TransactionHistory() {
    const isEmptyHistory = false;

    return (
        <div className="flex flex-col items-center gap-2">
            {isEmptyHistory ? <EmptyHistoryMessage /> : <TransactionHistoryList />}
        </div>
    );
}
