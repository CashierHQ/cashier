// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

import { IC_EXPLORER_BASE_URL } from "@/const";
import axios from "axios";

/**
 * Simple service for fetching token prices from IC Explorer
 */
class PriceService {
  /**
   * Fetch all token prices from IC Explorer
   * @returns Object mapping token IDs to their USD prices
   */
  public static async getAllPrices(): Promise<Record<string, number>> {
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
        throw new Error(`API error: ${response.data.statusCode}`);
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

      return priceMap;
    } catch (error) {
      console.error("Error fetching prices:", error);
      throw new Error("Failed to fetch prices from IC Explorer");
    }
  }
}

export default PriceService;
