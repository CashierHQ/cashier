import React, { createContext, useContext, useState, ReactNode } from "react";
import { InternetIdentity } from "@nfid/identitykit";

declare enum TransportType {
    NEW_TAB = 0,
    EXTENSION = 1,
    INTERNET_IDENTITY = 2,
    STOIC = 3,
    PLUG = 4,
}

export type SignerConfig = {
    id: string;
    providerUrl: string;
    label: string;
    transportType: TransportType;
    icon?: string;
    description?: string;
};

export enum WALLET_OPTIONS {
    GOOGLE = "Google login",
    INTERNET_IDENTITY = "Internet Identity",
    OTHER = "Other wallets",
    TYPING = "Typing",
}

type SignersContextType = {
    signers: SignerConfig[];
    currentConnectOption: WALLET_OPTIONS;
    setSigners: (signers: SignerConfig[]) => void;
    setCurrentConnectOption: (option: WALLET_OPTIONS) => void;
};

const SignersContext = createContext<SignersContextType | undefined>(undefined);

export const SignersProvider = ({ children }: { children: ReactNode }) => {
    const [signers, setSigners] = useState<SignerConfig[]>(
        isMobile() ? [InternetIdentity] : [InternetIdentity],
    );
    const [currentConnectOption, setCurrentConnectOption] = useState<WALLET_OPTIONS>(
        WALLET_OPTIONS.INTERNET_IDENTITY,
    );

    return (
        <SignersContext.Provider
            value={{ signers, currentConnectOption, setSigners, setCurrentConnectOption }}
        >
            {children}
        </SignersContext.Provider>
    );
};

export const useSigners = (): SignersContextType => {
    const context = useContext(SignersContext);
    if (!context) {
        throw new Error("useSigners must be used within a SignersProvider");
    }
    return context;
};

const isMobile = () => {
    if (
        /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
    ) {
        return true;
    } else {
        return false;
    }
};
