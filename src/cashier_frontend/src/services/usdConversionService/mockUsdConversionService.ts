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
