// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

import axios from "axios";
import { Err, Ok, type Result } from "ts-results-es";

const OMNITY_PRICE_API_URL = "https://api.omnity.network/api/price/tokens";

/**
 * Service for fetching Rune token prices from the Omnity price API.
 * Returns a map keyed by Omnity token_id (e.g. "Bitcoin-runes-DOG•GO•TO•THE•MOON").
 * Note: keys are token_ids, NOT canister addresses — different key space from TokenPriceService.
 */
class OmnityTokenPriceService {
  /**
   * Fetch all Rune token prices from the Omnity price API.
   * @returns Record mapping Omnity token_id to USD price
   */
  public async getTokenPrices(): Promise<
    Result<Record<string, number>, Error>
  > {
    try {
      const response = await axios.get<Record<string, string>>(
        OMNITY_PRICE_API_URL,
        {
          timeout: 10000,
          headers: { Accept: "application/json" },
        },
      );

      const priceMap: Record<string, number> = {};
      for (const [tokenId, priceStr] of Object.entries(response.data)) {
        const price = parseFloat(priceStr);
        if (!isNaN(price) && price > 0) {
          priceMap[tokenId] = Number(price.toFixed(7));
        }
      }

      return Ok(priceMap);
    } catch (error) {
      console.error("Failed to fetch prices from Omnity", error);
      return Err(new Error(`Failed to fetch prices from Omnity: ${error}`));
    }
  }
}

export const omnityTokenPriceService = new OmnityTokenPriceService();
