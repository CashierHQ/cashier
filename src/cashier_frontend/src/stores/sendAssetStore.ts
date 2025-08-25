// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

import {
  SendAssetInfo,
  TransactionStatus,
} from "@/services/types/wallet.types";
import { create } from "zustand";

interface SendAssetState {
  // Transaction data
  sendAssetInfo: SendAssetInfo | null;
  transactionStatus: TransactionStatus;
  transactionHash?: string;
  error?: Error | null;

  // UI state
  isConfirmationOpen: boolean;

  // Actions
  setSendAssetInfo: (info: SendAssetInfo) => void;
  setTransactionStatus: (status: TransactionStatus) => void;
  setTransactionHash: (hash: string) => void;
  setError: (error: Error | null) => void;

  openConfirmation: () => void;
  closeConfirmation: () => void;

  // Reset
  resetSendAsset: () => void;
  resetError: () => void;
}

export const useSendAssetStore = create<SendAssetState>((set) => ({
  // Initial state
  sendAssetInfo: null,
  transactionStatus: TransactionStatus.IDLE,
  transactionHash: undefined,
  error: null,
  isConfirmationOpen: false,

  // Actions
  setSendAssetInfo: (info) => set({ sendAssetInfo: info }),

  setTransactionStatus: (status) =>
    set({
      transactionStatus: status,
      // Automatically clear error when setting a new status that's not FAILED
      ...(status !== TransactionStatus.FAILED && { error: null }),
    }),

  setTransactionHash: (hash) => set({ transactionHash: hash }),

  setError: (error) =>
    set({
      error,
      transactionStatus: error
        ? TransactionStatus.FAILED
        : TransactionStatus.IDLE,
    }),

  openConfirmation: () => set({ isConfirmationOpen: true }),
  closeConfirmation: () => set({ isConfirmationOpen: false }),

  // Reset functions
  resetSendAsset: () =>
    set({
      sendAssetInfo: null,
      transactionStatus: TransactionStatus.IDLE,
      transactionHash: undefined,
      error: null,
      isConfirmationOpen: false,
    }),

  resetError: () => set({ error: null }),
}));
