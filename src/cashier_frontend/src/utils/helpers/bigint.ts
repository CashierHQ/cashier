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

export function scaleBigint(value: bigint, factor: number, decimals: number = 8): bigint {
    if (!Number.isFinite(factor)) {
        throw new Error("Factor must be a finite number.");
    }
    if (decimals < 0 || !Number.isInteger(decimals)) {
        throw new Error("Decimals must be a non-negative integer.");
    }

    // Handle negative factors safely
    const isNegative = factor < 0;
    const absFactor = Math.abs(factor);

    // Scale factor to avoid precision loss
    const scale = 10 ** decimals;
    const scaledFactor = Math.round(absFactor * scale);

    // BigInt multiplication and division
    const result = (value * BigInt(scaledFactor)) / BigInt(scale);

    return isNegative ? -result : result;
}
