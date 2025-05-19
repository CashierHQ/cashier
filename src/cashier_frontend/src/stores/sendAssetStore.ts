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

import { SendAssetInfo, TransactionStatus } from "@/services/types/wallet.types";
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
            transactionStatus: error ? TransactionStatus.FAILED : TransactionStatus.IDLE,
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
