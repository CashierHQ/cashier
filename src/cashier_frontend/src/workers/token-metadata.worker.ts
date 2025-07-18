// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

import { TokenUtilService } from "../services/tokenUtils.service";

// Define the expected message type
interface FetchMetadataMessage {
    type: "fetchMetadata";
    payload: {
        tokens: { address: string }[];
        batchSize: number;
    };
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
        try {
            const metadataMap: MetadataResult = {};

            // Process in batches
            for (let i = 0; i < tokens.length; i += batchSize) {
                const batch = tokens.slice(i, i + batchSize);
                const batchPromises = batch.map(async (token) => {
                    const metadata = await TokenUtilService.getTokenMetadata(token.address);

                    if (!metadata) {
                        return null;
                    }

                    if (token.address == "wxani-naaaa-aaaab-qadgq-cai") {
                        console.log("fee", metadata.fee);
                    }

                    return {
                        fee: metadata.fee !== undefined ? Number(metadata.fee) : undefined,
                        logo: metadata.icon,
                        decimals: metadata.decimals,
                        symbol: metadata.symbol,
                        name: metadata.name,
                    };
                });

                // Use Promise.allSettled to ensure the loop continues even if some requests fail
                const res = await Promise.allSettled(batchPromises);

                res.forEach((result, index) => {
                    if (result.status === "fulfilled" && result.value) {
                        const tokenAddress = batch[index].address;
                        metadataMap[tokenAddress] = result.value;
                    } else {
                    }
                });
            }

            const end = Date.now();
            const duration = end - start;
            try {
                ctx.postMessage({
                    type: "complete",
                    payload: {
                        metadataMap,
                        duration,
                        tokenCount: tokens.length,
                    },
                });
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
