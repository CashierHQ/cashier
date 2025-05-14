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
