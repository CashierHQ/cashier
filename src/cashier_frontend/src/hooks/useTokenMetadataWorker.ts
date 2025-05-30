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

import { useEffect, useRef, useState } from "react";
import { TokenMetadataMap } from "@/types/fungible-token.speculative";
import { FungibleToken } from "@/types/fungible-token.speculative";

// Type for the worker instance
type TokenMetadataWorker = Worker;

interface UseTokenMetadataWorkerOptions {
    batchSize?: number;
    onProgress?: (processed: number, total: number) => void;
}

interface WorkerState {
    isLoading: boolean;
    error: Error | null;
    metadataMap: TokenMetadataMap;
}

/**
 * Custom hook to manage the token metadata web worker
 */
export function useTokenMetadataWorker(options: UseTokenMetadataWorkerOptions = {}) {
    const { batchSize = 300, onProgress } = options;

    // Worker reference
    const workerRef = useRef<TokenMetadataWorker | null>(null);

    // State for worker results
    const [state, setState] = useState<WorkerState>({
        isLoading: false,
        error: null,
        metadataMap: {},
    });

    // Setup worker on mount
    useEffect(() => {
        // Create worker instance
        const worker = new Worker(new URL("../workers/token-metadata.worker.ts", import.meta.url), {
            type: "module",
        });

        // Set up message handler
        worker.onmessage = (event) => {
            const { type, payload } = event.data;

            console.log("[Worker Message]", type, typeof payload);

            switch (type) {
                case "ready":
                    // Worker is initialized
                    console.log("[Main] Token metadata worker is ready");
                    break;

                case "progress":
                    // Handle progress updates
                    if (onProgress) {
                        onProgress(payload.processed, payload.total);
                    }
                    // Optionally update partial results
                    // setState(prev => ({ ...prev, metadataMap: {...prev.metadataMap, ...payload.partialResults} }));
                    break;

                case "complete":
                    // Final result received
                    console.log("[Main] Received complete message from worker");
                    console.log(
                        "[Main] Metadata map received:",
                        Object.keys(payload.metadataMap).length,
                        "entries",
                    );

                    setState({
                        isLoading: false,
                        error: null,
                        metadataMap: payload.metadataMap || {},
                    });

                    console.log(
                        `[Main] Fetched metadata for ${payload.tokenCount} tokens in ${payload.duration}ms`,
                    );
                    break;

                case "error":
                    // Handle errors from worker
                    setState((prev) => ({
                        ...prev,
                        isLoading: false,
                        error: new Error(payload.message),
                    }));
                    console.error("[Worker Error]", payload.message);
                    break;
            }
        };

        // Handle worker errors
        worker.onerror = (error) => {
            setState((prev) => ({
                ...prev,
                isLoading: false,
                error: new Error(`Worker error: ${error.message}`),
            }));
            console.error("Worker error:", error);
        };

        // Store worker reference
        workerRef.current = worker;

        // Clean up worker on unmount
        return () => {
            worker.terminate();
            workerRef.current = null;
        };
    }, []);

    /**
     * Function to fetch metadata for tokens
     */
    const fetchMetadata = async (tokens: FungibleToken[]) => {
        if (!workerRef.current) {
            throw new Error("Worker not initialized");
        }

        if (!tokens || tokens.length === 0) {
            console.log("[Main] No tokens to process");
            setState({ isLoading: false, error: null, metadataMap: {} });
            return {};
        }

        console.log(`[Main] Preparing to send ${tokens.length} tokens to worker`);

        // Reset state
        setState({ isLoading: true, error: null, metadataMap: {} });

        try {
            // Log sample token data for debugging
            console.log("[Main] Sample token data:", tokens.slice(0, 2));

            // Send tokens to worker
            console.log("[Main] Sending tokens to worker");
            workerRef.current.postMessage({
                type: "fetchMetadata",
                payload: {
                    tokens,
                    batchSize,
                },
            });
            console.log("[Main] Message sent to worker");
        } catch (error) {
            console.error("[Main] Error sending message to worker:", error);
            setState({ isLoading: false, error: error as Error, metadataMap: {} });
        }
    };

    return {
        ...state,
        fetchMetadata,
    };
}
