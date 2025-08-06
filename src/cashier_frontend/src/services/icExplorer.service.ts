// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

import icExplorerAxiosClient from "@/axios/axiosClient";

// This interface is created based on the response from the icexplorer.io API
interface DataSourceToken {
    accountId: string;
    amount: string;
    ledgerId: string;
    symbol: string;
    valueUSD: string;
    // Additional fields from the response
    totalSupply?: string;
    owner?: string;
    subaccount?: string;
    tokenDecimal?: number;
    snapshotTime?: number;
}

/**
 * Detailed token information from IC Explorer
 */
export interface IcExplorerTokenDetail {
    controllerArray: string[];
    cycleBalance: string;
    fee: string;
    fullyDilutedMarketCap: string;
    holderAmount: number;
    ledgerId: string;
    marketCap: string;
    memorySize: string;
    mintingAccount: string;
    moduleHash: string;
    name: string;
    price: string;
    priceChange24: string;
    priceICP: string;
    source: string;
    standardArray: string[];
    supplyCap: string;
    symbol: string;
    tokenDecimal: number;
    totalSupply: string;
    transactionAmount: number;
    tvl: string;
    txVolume24: string;
}

export class ICExplorerService {
    constructor() {}

    async getUserTokens(principal: string): Promise<DataSourceToken[]> {
        const url = "holder/user";
        const response = await icExplorerAxiosClient.post(url, {
            principal,
            page: 1,
            size: 300,
            isDesc: true,
        });

        return response.data.list;
    }

    async getListToken(): Promise<IcExplorerTokenDetail[]> {
        const url = "token/list";
        const response = await icExplorerAxiosClient.post(url, {
            page: 1,
            size: 300,
        });

        console.log("getListToken response", response.data.list);

        return response.data.list;
    }
}
