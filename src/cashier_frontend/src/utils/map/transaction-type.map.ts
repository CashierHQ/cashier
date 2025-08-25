// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

import {
  TransactionHistoryItemReceive,
  TransactionHistoryItemSend,
} from "@/components/ui/transaction-history";
import { TransactionType } from "@/types/transaction-type";

const transactionItemComponentMap = {
  [TransactionType.Send]: TransactionHistoryItemSend,
  [TransactionType.Receive]: TransactionHistoryItemReceive,
};

export function mapTransactionTypeToTransactionItemComponent(
  type: TransactionType,
) {
  return transactionItemComponentMap[type];
}
