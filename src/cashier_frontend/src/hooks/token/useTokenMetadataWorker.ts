// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

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
export function useTokenMetadataWorker(
  options: UseTokenMetadataWorkerOptions = {},
) {
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
    const worker = new Worker(
      new URL("../../workers/token-metadata.worker.ts", import.meta.url),
      {
        type: "module",
      },
    );

    // Set up message handler
    worker.onmessage = (event) => {
      const { type, payload } = event.data;

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
  const fetchMetadata = async (
    tokens: FungibleToken[],
  ): Promise<TokenMetadataMap> => {
    if (!workerRef.current) {
      throw new Error("Worker not initialized");
    }

    if (!tokens || tokens.length === 0) {
      setState({ isLoading: false, error: null, metadataMap: {} });
      return {};
    }

    console.log(`[Main] Preparing to send ${tokens.length} tokens to worker`);

    // Reset state
    setState({ isLoading: true, error: null, metadataMap: {} });

    // Return a Promise that resolves when the worker completes
    return new Promise((resolve, reject) => {
      if (!workerRef.current) {
        reject(new Error("Worker not initialized"));
        return;
      }

      // Set up one-time message handler for this request
      const handleMessage = (event: MessageEvent) => {
        const { type, payload } = event.data;

        if (type === "complete") {
          // Remove the handler
          workerRef.current?.removeEventListener("message", handleMessage);
          resolve(payload.metadataMap || {});
        } else if (type === "error") {
          // Remove the handler
          workerRef.current?.removeEventListener("message", handleMessage);
          reject(new Error(payload.message));
        }
      };

      // Add the one-time handler
      workerRef.current.addEventListener("message", handleMessage);

      try {
        workerRef.current.postMessage({
          type: "fetchMetadata",
          payload: {
            tokens,
            batchSize,
          },
        });
      } catch (error) {
        // Remove the handler
        workerRef.current?.removeEventListener("message", handleMessage);
        console.error("[Main] Error sending message to worker:", error);
        setState({ isLoading: false, error: error as Error, metadataMap: {} });
        reject(error);
      }
    });
  };

  return {
    ...state,
    fetchMetadata,
  };
}
