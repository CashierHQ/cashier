// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

import { ConversionRates } from "../types/usdConversion.service.types";

export interface IUsdConversionService {
    tokenToUsd(principal: string, address: string, amount: number): Promise<number | undefined>;
    usdToToken(principal: string, address: string, amount: number): Promise<number | undefined>;
    getConversionRates(principal: string, address: string): Promise<ConversionRates>;
}
