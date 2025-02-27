import {
    TransactionHistoryItemReceive,
    TransactionHistoryItemSend,
} from "@/components/token-details/transaction-list";
import { TransactionType } from "@/types/transaction-type";

export const transactionItemComponentMap = {
    [TransactionType.Send]: TransactionHistoryItemSend,
    [TransactionType.Receive]: TransactionHistoryItemReceive,
};

export function mapTransactionTypeToTransactionItemComponent(type: TransactionType) {
    return transactionItemComponentMap[type];
}
