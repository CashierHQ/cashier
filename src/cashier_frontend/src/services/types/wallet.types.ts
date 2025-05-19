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

export enum TransactionStatus {
    IDLE = "IDLE",
    PROCESSING = "PROCESSING",
    SUCCESS = "SUCCESS",
    FAILED = "FAILED",
}

export interface SendAssetInfo {
    amountNumber: number;
    asset: {
        address: string;
        chain: string;
        decimals: number;
        symbol: string;
    };
    destinationAddress: string;
    feeAmount?: number; // Optional network fee amount
    feeSymbol?: string; // Optional network fee token symbol
}
