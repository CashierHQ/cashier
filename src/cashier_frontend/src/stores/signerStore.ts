import { create } from "zustand";
import { IdentityKitSignerConfig, InternetIdentity, NFIDW, Stoic } from "@nfid/identitykit";

export enum WALLET_OPTIONS {
    GOOGLE = "Google login",
    INTERNET_IDENTITY = "Internet Identity",
    OTHER = "Other wallets",
    TYPING = "Typing",
}

interface SignerState {
    signers: IdentityKitSignerConfig[];
    currentConnectOption: WALLET_OPTIONS;
    setSigners: (signers: IdentityKitSignerConfig[]) => void;
    setCurrentConnectOption: (option: WALLET_OPTIONS) => void;
    reset: () => void;
    initInternetIdentitySigner: () => void;
    initOtherWalletSigners: () => void;
}

const defaultSigners = [InternetIdentity];

const otherSigners = [NFIDW, Stoic];

export const useSignerStore = create<SignerState>((set) => ({
    signers: defaultSigners,
    currentConnectOption: WALLET_OPTIONS.INTERNET_IDENTITY,
    setSigners: (signers) => set({ signers }),
    setCurrentConnectOption: (option) => set({ currentConnectOption: option }),
    reset: () =>
        set({
            signers: defaultSigners,
            currentConnectOption: WALLET_OPTIONS.INTERNET_IDENTITY,
        }),
    initInternetIdentitySigner: () =>
        set({
            signers: defaultSigners,
            currentConnectOption: WALLET_OPTIONS.INTERNET_IDENTITY,
        }),
    initOtherWalletSigners: () =>
        set({
            signers: otherSigners,
            currentConnectOption: WALLET_OPTIONS.OTHER,
        }),
}));
