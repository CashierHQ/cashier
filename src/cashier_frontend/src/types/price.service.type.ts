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

// Response from the IC Explorer API token list endpoint
export interface TokenListResponse {
    statusCode: number;
    data: {
        total: string;
        list: TokenInfo[];
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

// Token information returned by the API
export interface TokenInfo {
    ledgerId: string;
    name: string;
    symbol: string;
    tokenDecimal: number;
    fee: string;
    mintingAccount: string;
    totalSupply: string;
    supplyCap: string;
    tvl: string;
    cycleBalance: string;
    memorySize: string;
    moduleHash: string;
    source: string;
    marketCap: string;
    fullyDilutedMarketCap: string;
    holderAmount: number;
    transactionAmount: number;
    price: string;
    priceChange24: string;
    txVolume24: string;
    priceICP: string;
    standardArray: string[];
    controllerArray: string[];
}

// Chains that the price service supports
export enum Chain {
    IC = "IC",
    ETH = "ETH",
    // Add more chains as needed
}

// Simplified price data structure for application use
export interface TokenPrice {
    ledgerId: string;
    symbol: string;
    name: string;
    price: number; // USD price
    priceChange24h: number; // 24h price change percentage
    marketCap: number; // Market cap in USD
    volume24h: number; // 24h volume in USD
    decimals: number; // Token decimals
    lastUpdated: Date; // When the price was last updated
}

// Error types for the price service
export enum PriceErrorType {
    NETWORK_ERROR = "NETWORK_ERROR",
    API_ERROR = "API_ERROR",
    TOKEN_NOT_FOUND = "TOKEN_NOT_FOUND",
    UNSUPPORTED_CHAIN = "UNSUPPORTED_CHAIN",
    UNKNOWN_ERROR = "UNKNOWN_ERROR",
}

// Custom error class for price service
export class PriceServiceError extends Error {
    type: PriceErrorType;

    constructor(message: string, type: PriceErrorType) {
        super(message);
        this.type = type;
        this.name = "PriceServiceError";
    }
}
