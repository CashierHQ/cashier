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
