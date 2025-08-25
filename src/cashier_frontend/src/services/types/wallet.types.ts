// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

export enum TransactionStatus {
  IDLE = "IDLE",
  PROCESSING = "PROCESSING",
  SUCCESS = "SUCCESS",
  FAILED = "FAILED",
}

export interface SendAssetInfo {
  amountNumber: number;
  asset: {
    address: string;
    chain: string;
    decimals: number;
    symbol: string;
  };
  destinationAddress: string;
  feeAmount?: number; // Optional network fee amount
  feeSymbol?: string; // Optional network fee token symbol
}
