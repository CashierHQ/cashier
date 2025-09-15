// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

import { IC_EXPLORER_BASE_URL } from "@/const";
import axios from "axios";
import queryString from "query-string";

const icExplorerAxiosClient = axios.create({
  baseURL: IC_EXPLORER_BASE_URL,
  headers: {
    accept: "application/json",
    "cache-control": "no-cache",
    "content-type": "application/json",
    pragma: "no-cache",
    priority: "u=1, i",
    "Referrer-Policy": "strict-origin-when-cross-origin",
  },
  paramsSerializer: {
    serialize: (params) => queryString.stringify(params),
  },
});

icExplorerAxiosClient.interceptors.response.use(
  (response) => {
    if (response && response.data) {
      return response.data;
    }

    return response;
  },
  (err) => {
    return Promise.reject(err.response);
  },
);

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
