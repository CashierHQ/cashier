// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

import { IC_EXPLORER_BASE_URL } from "$modules/token/constants";
import axios from "axios";
import queryString from "query-string";
import { Err, Ok, type Result } from "ts-results-es";
import { type TokenPriceService } from ".";

/**
 * Simple service for fetching token prices from IC Explorer
 */
class IcExplorerTokenPriceService implements TokenPriceService {
  /**
   * Fetch the list of tokens from IC Explorer
   * @returns Promise resolving to an array of IcExplorerTokenDetail objects
   */
  public async getListToken(): Promise<IcExplorerTokenDetail[]> {
    const url = "token/list";

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

    const response = await icExplorerAxiosClient.post(url, {
      page: 1,
      size: 300,
    });

    console.log("getListToken response", response.data.data.list);

    return response.data.data.list;
  }

  /**
   * Fetch all token prices from IC Explorer
   * @returns Object mapping token IDs to their USD prices
   */
  public async getTokenPrices(): Promise<
    Result<Record<string, number>, Error>
  > {
    try {
      const client = axios.create({
        baseURL: IC_EXPLORER_BASE_URL,
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        timeout: 10000, // 10 seconds timeout
      });

      const response = await client.post("/token/list", {
        page: 1,
        size: 300, // Fetch up to 300 tokens
      });

      if (response.data.statusCode !== 600) {
        return Err(new Error(`API error: ${response.data.statusCode}`));
      }

      // Map to a simple object of tokenId -> price
      const priceMap: Record<string, number> = {};
      for (const token of response.data.data.list) {
        try {
          priceMap[token.ledgerId] = Number(parseFloat(token.price).toFixed(7));
        } catch (e) {
          console.warn(
            `Failed to parse price for ${token.symbol} (${token.ledgerId})`,
            e,
          );
        }
      }

      return Ok(priceMap);
    } catch (error) {
      return Err(
        new Error(`Failed to fetch prices from IC Explorer: ${error}`),
      );
    }
  }
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

export const icExplorerTokenPriceService = new IcExplorerTokenPriceService();
