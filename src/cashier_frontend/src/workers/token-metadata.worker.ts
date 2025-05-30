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

import { TokenUtilService } from "../services/tokenUtils.service";

// Define the expected message type
interface FetchMetadataMessage {
    type: "fetchMetadata";
    payload: {
        tokens: { address: string }[];
        batchSize: number;
    };
}

// Define token metadata type to match what's returned by TokenUtilService
interface TokenMetadata {
    fee?: number;
    icon?: string;
    decimals?: number;
    name?: string;
    symbol?: string;
}

// Define response type
interface MetadataResult {
    [address: string]: {
        fee?: number;
        logo?: string;
        decimals?: number;
    };
}

// Worker context
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const ctx: Worker = self as any;

// Listen for messages from the main thread
ctx.addEventListener("message", async (event: MessageEvent<FetchMetadataMessage>) => {
    const { type, payload } = event.data;

    if (type === "fetchMetadata") {
        const { tokens, batchSize } = payload;
        const start = Date.now();
        let failedTokens = 0;
        let processedTokens = 0;

        try {
            const metadataMap: MetadataResult = {};

            console.log(
                `[Worker] Starting metadata fetch for ${tokens.length} tokens with batch size ${batchSize}`,
            );

            // Process in batches
            for (let i = 0; i < tokens.length; i += batchSize) {
                const batch = tokens.slice(i, i + batchSize);
                const batchPromises = batch.map(async (token) => {
                    const metadata = await TokenUtilService.getTokenMetadata(token.address);

                    if (!metadata) {
                        return null;
                    }

                    return {
                        fee: metadata.fee !== undefined ? Number(metadata.fee) : undefined,
                        logo: metadata.icon,
                        decimals: metadata.decimals,
                    };
                });

                // Use Promise.allSettled to ensure the loop continues even if some requests fail
                const res = await Promise.allSettled(batchPromises);

                res.forEach((result, index) => {
                    if (result.status === "fulfilled" && result.value) {
                        const tokenAddress = batch[index].address;
                        metadataMap[tokenAddress] = result.value;
                        processedTokens++;
                    } else {
                        console.warn(
                            `[Worker] Failed to fetch metadata for token at index ${i + index}:`,
                            result.status,
                        );
                        failedTokens++;
                    }
                });

                console.log(
                    `[Worker] Processed batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(tokens.length / batchSize)}: ${batch.length} tokens`,
                );
            }

            const end = Date.now();
            const duration = end - start;

            console.log(
                `[Worker] Metadata fetch completed in ${duration}ms for ${tokens.length} tokens`,
            );
            console.log(
                `[Worker] Successfully processed: ${processedTokens}, Failed: ${failedTokens}`,
            );
            console.log(`[Worker] Metadata map size: ${Object.keys(metadataMap).length}`);

            try {
                console.log("[Worker] Attempting to send complete message");
                // Send the complete result back to the main thread
                ctx.postMessage({
                    type: "complete",
                    payload: {
                        metadataMap,
                        duration,
                        tokenCount: tokens.length,
                    },
                });
                console.log("[Worker] Complete message sent successfully");
            } catch (error) {
                console.error("[Worker] Error sending complete message:", error);

                // Try sending a smaller response if the original failed
                try {
                    ctx.postMessage({
                        type: "error",
                        payload: {
                            message: "Failed to send complete results - payload may be too large",
                            name: "MessageError",
                        },
                    });
                } catch (innerError) {
                    console.error("[Worker] Failed to send error message:", innerError);
                }
            }
        } catch (error) {
            // Send error back to main thread
            ctx.postMessage({
                type: "error",
                payload: {
                    message: error instanceof Error ? error.message : "Unknown error in worker",
                    name: error instanceof Error ? error.name : "Error",
                },
            });
        }
    }
});

// Signal that the worker is ready
ctx.postMessage({ type: "ready" });
