// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

export type IcExplorerTokenListResponseItem = {
    ledgerId: string;
    symbol: string;
    totalSupply: string;
    owner: string;
    subaccount: string;
    accountId: string;
    amount: string;
    tokenDecimal: number;
    snapshotTime: number;
    valueUSD: string;
};

export type IcExplorerTokenListResponse = {
    pageNum: number;
    pageSize: number;
    size: number;
    pages: number;
    total: number;
    list: IcExplorerTokenListResponseItem[];
};

export type IcExplorerHolderResponseItem = {
    ledgerId: string;
    symbol: string;
    totalSupply: string;
    owner: string;
    subaccount: string;
    accountId: string;
    amount: string;
    tokenDecimal: number;
    snapshotTime: number;
    valueUSD: string;
};

export type IcExplorerHolderResponse = {
    pageNum: number;
    pageSize: number;
    size: number;
    pages: number;
    total: number;
    list: IcExplorerHolderResponseItem[];
};
