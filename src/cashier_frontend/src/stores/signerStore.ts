import { create } from "zustand";
import { IdentityKitSignerConfig } from "@nfid/identitykit";
import {
    WALLET_OPTIONS,
    GoogleSigner,
    defaultSigners,
    allWalletSigners,
} from "@/constants/wallet-options";

interface SignerState {
    signers: IdentityKitSignerConfig[];
    currentConnectOption: WALLET_OPTIONS;
    setSigners: (signers: IdentityKitSignerConfig[]) => void;
    setCurrentConnectOption: (option: WALLET_OPTIONS) => void;
    reset: () => void;
}

export { WALLET_OPTIONS, GoogleSigner }; // Re-export for backward compatibility

export const useSignerStore = create<SignerState>((set) => ({
    signers: allWalletSigners,
    currentConnectOption: WALLET_OPTIONS.INTERNET_IDENTITY,
    setSigners: (signers) => set({ signers }),
    setCurrentConnectOption: (option) => set({ currentConnectOption: option }),
    reset: () =>
        set({
            signers: defaultSigners,
            currentConnectOption: WALLET_OPTIONS.INTERNET_IDENTITY,
        }),
}));
