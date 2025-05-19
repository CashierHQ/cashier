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

import icExplorerAxiosClient from "@/axios/axiosClient";
import {
    IcExplorerHolderResponse,
    IcExplorerTokenListResponse,
    IcExplorerTokenListResponseItem,
} from "../types/icExplorer.types";
import { AxiosInstance } from "axios";
import { IUsdConversionService } from "./IUsdConversionService";
import { ConversionRates } from "../types/usdConversion.service.types";

export class IcExplorerUsdConversionService implements IUsdConversionService {
    private client: AxiosInstance;

    constructor() {
        this.client = icExplorerAxiosClient;
    }

    public async tokenToUsd(
        principal: string,
        address: string,
        amount: number,
    ): Promise<number | undefined> {
        const { tokenToUsd: rate } = await this.getConversionRates(principal, address);

        if (rate === undefined) {
            return undefined;
        }

        return amount * rate;
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

    public async getConversionRates(principal: string, address: string): Promise<ConversionRates> {
        const token = await this._getToken(principal, address);

        if (!token) {
            return {
                canConvert: false,
                tokenToUsd: undefined,
                usdToToken: undefined,
            };
        }

        const tokenAmount = parseFloat(token.amount);
        const tokenUsdAmount = parseFloat(token.valueUSD);
        const tokenToUsd = tokenUsdAmount / tokenAmount;
        const usdToToken = 1 / tokenToUsd;

        return {
            canConvert: true,
            tokenToUsd,
            usdToToken,
        };
    }

    public async _getTokens(principal: string): Promise<IcExplorerTokenListResponseItem[]> {
        const response = await this.client.post<IcExplorerTokenListResponse>("/holder/user", {
            page: 1,
            size: 100,
            isDesc: false,
            principal,
        });

        return response.data.list;
    }

    public async _getToken(
        principal: string,
        address: string,
    ): Promise<IcExplorerTokenListResponseItem | undefined> {
        const tokens = await this._getTokens(principal);
        if (tokens.length > 0) {
            const token = tokens.find((token) => token.ledgerId === address);
            return token;
        } else {
            const response = await this.client.post<IcExplorerHolderResponse>("/holder/token", {
                page: 1,
                size: 1,
                isDesc: false,
                ledgerId: address,
            });
            console.log("🚀 ~ IcExplorerUsdConversionService ~ response:", response);
            return response.data.list[0];
        }
    }
}
