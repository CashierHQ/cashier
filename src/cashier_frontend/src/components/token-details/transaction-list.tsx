import { TransactionType } from "@/types/transaction-type";
import History from "@/components/ui/transaction-history";

export function TransactionHistoryList() {
    return (
        <History.Root>
            <History.Timestamp date={new Date(2024, 6, 29)} />
            <History.Item type={TransactionType.Receive} />
        </History.Root>
    );
}
