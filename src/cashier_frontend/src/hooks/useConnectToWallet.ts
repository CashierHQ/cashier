import { useAuth, useIdentity } from "@nfid/identitykit/react";
import { useState, useEffect } from "react";

export enum WALLET_OPTIONS {
    GOOGLE = "Google login",
    INTERNET_IDENTITY = "Internet Identity",
    OTHER = "Other wallets",
    TYPING = "Typing",
}

export type WalletType = "Internet Identity" | "NFID" | "Stoic" | "Unknown";

const useConnectToWallet = () => {
    const { connect, user } = useAuth();
    const identity = useIdentity();
    const [currentWallet, setCurrentWallet] = useState<WalletType>("Unknown");
    const [selectedOption, setSelectedOption] = useState<WALLET_OPTIONS | undefined>();

    useEffect(() => {
        if (identity && user) {
            // Determine wallet type based on the selected option
            if (selectedOption === WALLET_OPTIONS.INTERNET_IDENTITY) {
                setCurrentWallet("Internet Identity");
            } else if (selectedOption === WALLET_OPTIONS.OTHER) {
                // When OTHER is selected, it could be either NFID or Stoic
                // You might need additional logic to determine which one
                setCurrentWallet("NFID"); // or 'Stoic' depending on actual connection
            } else {
                setCurrentWallet("Unknown");
            }
        } else {
            setCurrentWallet("Unknown");
        }
    }, [identity, user, selectedOption]);

    const connectToWallet = async (e: React.MouseEvent<HTMLButtonElement>) => {
        e.preventDefault();
        e.stopPropagation();

        try {
            await connect();
        } catch (error) {
            console.error("Failed to connect wallet:", error);
            setCurrentWallet("Unknown");
        }
    };

    return {
        connectToWallet,
        currentWallet,
        isConnected: !!user,
        principalId: user?.principal.toString(),
    };
};

export default useConnectToWallet;
