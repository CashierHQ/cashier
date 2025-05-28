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

import axios from "axios";

/**
 * Simple service for fetching token prices from IC Explorer
 */
export class PriceService {
    private static readonly IC_EXPLORER_API = "https://api.icexplorer.io/api";

    /**
     * Fetch all token prices from IC Explorer
     * @returns Object mapping token IDs to their USD prices
     */
    public static async getAllPrices(): Promise<Record<string, number>> {
        try {
            const client = axios.create({
                baseURL: PriceService.IC_EXPLORER_API,
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
