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

type SignersContextType = {
    signers: SignerConfig[];
    setSigners: (signers: SignerConfig[]) => void;
};

const SignersContext = createContext<SignersContextType | undefined>(undefined);

export const SignersProvider = ({ children }: { children: ReactNode }) => {
    const [signers, setSigners] = useState<SignerConfig[]>(
        isMobile() ? [InternetIdentity] : [InternetIdentity],
    );

    return (
        <SignersContext.Provider value={{ signers, setSigners }}>
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
