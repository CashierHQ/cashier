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
import { groupTransactionsByDate } from "./transactionHistoryService";

describe("groupTransactionsByDate", () => {
    it("should group transactions by date", () => {
        const transactions = [
            {
                createdAt: new Date("2024-03-01T10:15:00Z"),
            },
            {
                createdAt: new Date("2024-03-01T15:30:00Z"),
            },
            {
                createdAt: new Date("2024-03-02T08:00:00Z"),
            },
        ] as TransactionRecord[];

        const result = groupTransactionsByDate(transactions);

        expect(result).toHaveLength(2);
        expect(result[0].date).toBe("2024-03-02T00:00:00.000Z");
        expect(result[0].transactions).toHaveLength(1);
        expect(result[1].date).toBe("2024-03-01T00:00:00.000Z");
        expect(result[1].transactions).toHaveLength(2);
    });

    it("should return an empty array if no transactions are provided", () => {
        const result = groupTransactionsByDate([]);
        expect(result).toEqual([]);
    });
});
