// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

export function convert(amount: number | undefined, rate: number | undefined) {
    if (amount === undefined || rate === undefined) return undefined;

    return amount * rate;
}
