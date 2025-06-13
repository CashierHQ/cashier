// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

export type ExistingConversionRate = {
    canConvert: true;
    tokenToUsd: number;
    usdToToken: number;
};

export type NonExistingConversionRate = {
    canConvert: false;
    tokenToUsd: undefined;
    usdToToken: undefined;
};

export type ConversionRates = ExistingConversionRate | NonExistingConversionRate;
