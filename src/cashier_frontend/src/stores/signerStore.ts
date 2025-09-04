// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

import { create } from "zustand";
import { IdentityKitSignerConfig } from "@nfid/identitykit";
import {
  WALLET_OPTIONS,
  DEFAULT_SIGNERS,
  ALL_WALLET_SIGNERS,
} from "@/constants/wallet-options";

interface SignerState {
  signers: IdentityKitSignerConfig[];
  currentConnectOption: WALLET_OPTIONS | undefined;
  setSigners: (signers: IdentityKitSignerConfig[]) => void;
  setCurrentConnectOption: (option: WALLET_OPTIONS | undefined) => void;
  reset: () => void;
} // Re-export for backward compatibility

export const useSignerStore = create<SignerState>((set) => ({
  signers: ALL_WALLET_SIGNERS,
  currentConnectOption: WALLET_OPTIONS.INTERNET_IDENTITY,
  setSigners: (signers) => set({ signers }),
  setCurrentConnectOption: (option) => set({ currentConnectOption: option }),
  reset: () =>
    set({
      signers: DEFAULT_SIGNERS,
      currentConnectOption: WALLET_OPTIONS.INTERNET_IDENTITY,
    }),
}));
