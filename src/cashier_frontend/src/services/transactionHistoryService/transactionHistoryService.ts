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

import { TransactionRecord } from "../../types/transaction-record.speculative";

export function groupTransactionsByDate(
    transactions: TransactionRecord[],
): { date: string; transactions: TransactionRecord[] }[] {
    const transactionMap = transactions.reduce((acc, transaction) => {
        const dateKey = new Date(
            Date.UTC(
                transaction.createdAt.getUTCFullYear(),
                transaction.createdAt.getUTCMonth(),
                transaction.createdAt.getUTCDate(),
            ),
        ).toISOString();

        if (!acc.has(dateKey)) {
            acc.set(dateKey, []);
        }
        acc.get(dateKey)!.push(transaction);

        return acc;
    }, new Map<string, TransactionRecord[]>());

    return Array.from(transactionMap, ([date, transactions]) => ({ date, transactions })).sort(
        (a, b) => {
            const dateA = new Date(a.date);
            const dateB = new Date(b.date);

            return Number(dateB) - Number(dateA);
        },
    );
}
