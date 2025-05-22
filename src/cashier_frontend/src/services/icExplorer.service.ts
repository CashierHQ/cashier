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
import { Principal } from "@dfinity/principal";
import { toNullable } from "@dfinity/utils";
import { AddTokenItem } from "../../../declarations/token_storage/token_storage.did";

export const IC_EXPLORER_IMAGES_PATH = "https://api.icexplorer.io/images/";

export interface GetUserTokensRequest {
    principal: string;
    isDesc: boolean;
    page: number;
    size: number;
}

// This interface is created based on the response from the icexplorer.io API
export interface DataSourceToken {
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
 * Maps a DataSourceToken to the target interface needed by the token storage
 * @param token The source token data from icExplorer API
 * @returns An object with the target structure
 */
export function mapDataSourceTokenToAddTokenInput(token: DataSourceToken): {
    decimals: [] | [number];
    chain: string;
    name: [] | [string];
    ledger_id: [] | [Principal];
    index_id: [] | [Principal];
    symbol: [] | [string];
} {
    return {
        // Convert tokenDecimal to optional array format
        decimals: toNullable(token.tokenDecimal),

        // Always set chain to 'IC' because úing ICExplorer API
        chain: "IC",

        // Symbol is mapped as optional array
        symbol: toNullable(token.symbol),

        // We don't have name in the source, so leave it empty
        name: toNullable(token.symbol),

        // Convert ledgerId to Principal if it's a valid string
        ledger_id: token.ledgerId
            ? (() => {
                  try {
                      return [Principal.fromText(token.ledgerId)];
                  } catch (error) {
                      console.error("Invalid ledger ID format:", error);
                      return [];
                  }
              })()
            : [],

        // We don't have index_id in the source, so leave it empty
        index_id: [],
    };
}

/**
 * Maps a TokenListItem to the target interface needed by the token storage
 * @param token The source token data from icExplorer token list API
 * @returns An object with the target structure for adding to token storage
 */
export function mapTokenListItemToAddTokenInput(token: TokenListItem): {
    decimals: [] | [number];
    chain: string;
    name: [] | [string];
    ledger_id: [] | [Principal];
    index_id: [] | [Principal];
    symbol: [] | [string];
    fee: [] | [bigint];
} {
    return {
        // Convert token0Decimal to optional array format
        decimals: toNullable(token.tokenDecimal),

        // Always set chain to 'IC' because we're using ICExplorer API
        chain: "IC",

        // Symbol is mapped as optional array
        symbol: toNullable(token.symbol),

        // Use token0Symbol for name as well since we don't have a separate name field
        name: toNullable(token.symbol),

        // Convert token0LedgerId to Principal if it's a valid string
        ledger_id: token.ledgerId
            ? (() => {
                  try {
                      return [Principal.fromText(token.ledgerId)];
                  } catch (error) {
                      console.error("Invalid ledger ID format:", error);
                      return [];
                  }
              })()
            : [],

        // We don't have index_id in the source, so leave it empty
        index_id: [],

        fee: toNullable(0n),
    };
}

export function mapTokenListItemToAddTokenItem(token: IcExplorerTokenDetail): AddTokenItem {
    return {
        fee: token.fee
            ? (() => {
                  try {
                      // Parse the fee string to handle decimal values
                      // Remove decimal part if present, as BigInt can't handle decimals
                      const feeValue = token.fee.includes(".")
                          ? token.fee.substring(0, token.fee.indexOf("."))
                          : token.fee;
                      return toNullable(BigInt(feeValue));
                  } catch (error) {
                      console.error("Error converting fee to BigInt:", error);
                      return toNullable(0n);
                  }
              })()
            : toNullable(0n),
        decimals: token.tokenDecimal,
        chain: "IC",
        name: token.name,
        ledger_id: toNullable(Principal.fromText(token.ledgerId)),
        index_id: [],
        symbol: token.symbol,
        address: token.ledgerId,
    };
}

export interface UserTokensListResponse {
    total: string;
    list: DataSourceToken[];
    pageNum: number;
    pageSize: number;
    size: number;
    startRow: string;
    endRow: string;
    pages: number;
    prePage: number;
    nextPage: number;
    isFirstPage: boolean;
    isLastPage: boolean;
    hasPreviousPage: boolean;
    hasNextPage: boolean;
    navigatePages: number;
    navigateFirstPage: number;
    navigateLastPage: number;
}

export interface GetUserTokensResponse {
    statusCode: number;
    data: UserTokensListResponse;
}

export interface TokenListResponse {
    statusCode: number;
    data: {
        total: string;
        list: TokenListItem[];
        pageNum: number;
        pageSize: number;
        size: number;
        startRow: string;
        endRow: string;
        pages: number;
        prePage: number;
        nextPage: number;
        isFirstPage: boolean;
        isLastPage: boolean;
        hasPreviousPage: boolean;
        hasNextPage: boolean;
        navigatePages: number;
        navigateFirstPage: number;
        navigateLastPage: number;
    };
}

export interface TokenListItem {
    ledgerId: string;
    symbol: string;
    totalSupply?: string;
    owner?: string;
    subaccount?: string;
    accountId: string;
    amount: string;
    tokenDecimal: number;
    snapshotTime: number;
    valueUSD: string;
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
