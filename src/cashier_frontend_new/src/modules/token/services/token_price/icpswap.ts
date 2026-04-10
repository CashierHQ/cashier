// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

import axios from "axios";
import { Err, Ok, type Result } from "ts-results-es";
import { type TokenPriceService } from ".";

const ICPSWAP_API_URL = "https://api.icpswap.com/info/token/all";

/** Response envelope from ICPSwap REST API */
interface IcpSwapApiResponse {
  code: number;
  message: string | null;
  data: IcpSwapTokenInfo[];
}

/** Per-token price data from ICPSwap info API (only fields we use) */
interface IcpSwapTokenInfo {
  tokenLedgerId: string; // canister ID — used as price map key
  price: string; // USD price as decimal string e.g. "2.478995297652031000"
}

/**
 * Service for fetching token prices from ICPSwap REST API.
 * Uses https://api.icpswap.com/info/token/all for real-time USD prices.
 *
 * NOTE: The ICPSwap on-chain NodeIndex canister was tested and found to return stale prices;
 * this REST API is preferred for accuracy (verified: 20 rapid requests, 0 rate-limit errors).
 */
class IcpswapTokenPriceService implements TokenPriceService {
  /**
   * Fetch all token prices from ICPSwap info API
   * @returns Object mapping canister IDs to USD prices
   */
  public async getTokenPrices(): Promise<Result<Record<string, number>, Error>> {
    try {
      const response = await axios.get<IcpSwapApiResponse>(ICPSWAP_API_URL, {
        timeout: 10000,
        headers: { Accept: "application/json" },
      });

      if (response.data.code !== 200 || !response.data.data) {
        return Err(new Error(`ICPSwap API error: code ${response.data.code}`));
      }

      // Map tokenLedgerId (canister ID) -> USD price
      const priceMap: Record<string, number> = {};
      for (const token of response.data.data) {
        const price = parseFloat(token.price);
        if (!isNaN(price) && price > 0) {
          priceMap[token.tokenLedgerId] = Number(price.toFixed(7));
        }
      }

      return Ok(priceMap);
    } catch (error) {
      console.error("Failed to fetch prices from ICPSwap", error);
      return Err(new Error(`Failed to fetch prices from ICPSwap: ${error}`));
    }
  }
}

export const icpswapTokenPriceService = new IcpswapTokenPriceService();
