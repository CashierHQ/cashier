// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

import { ConversionRates } from "../types/usdConversion.service.types";
import { IUsdConversionService } from "./IUsdConversionService";

export class MockUsdConversionService implements IUsdConversionService {
    private conversionMap: { [key: string]: number };

    constructor() {
        this.conversionMap = {
            "x5qut-viaaa-aaaar-qajda-cai": 12.345,
            "k64dn-7aaaa-aaaam-qcdaq-cai": 0.00543,
        };
    }

    public async usdToToken(
        principal: string,
        address: string,
        amount: number,
    ): Promise<number | undefined> {
        const { usdToToken: rate } = await this.getConversionRates(principal, address);

        if (rate === undefined) {
            return undefined;
        }

        return amount * rate;
    }

    public async tokenToUsd(principal: string, address: string, amount: number) {
        const { tokenToUsd: rate } = await this.getConversionRates(principal, address);

        if (rate === undefined) {
            return undefined;
        }

        return amount * rate;
    }

    public async getConversionRates(_: string, address: string): Promise<ConversionRates> {
        const tokenToUsd = this.conversionMap[address] ?? 1;

        return {
            canConvert: true,
            tokenToUsd,
            usdToToken: 1 / tokenToUsd,
        };
    }
}
