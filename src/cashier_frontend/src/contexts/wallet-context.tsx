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

import React, { createContext, useContext, useState, ReactNode } from "react";

// Define panel types
export type WalletPanelType =
    | "wallet"
    | "send"
    | "receive"
    | "details"
    | "manage"
    | "import"
    | "swap";

// Define panel params for navigation
export type WalletPanelParams = {
    tokenId?: string;
};

type WalletContextType = {
    isWalletOpen: boolean;
    openWallet: () => void;
    closeWallet: () => void;
    toggleWallet: () => void;
    activePanel: WalletPanelType;
    panelParams: WalletPanelParams;
    navigateToPanel: (panel: WalletPanelType, params?: WalletPanelParams) => void;
};

const WalletContext = createContext<WalletContextType | null>(null);

export const useWalletContext = () => {
    const context = useContext(WalletContext);
    if (!context) {
        throw new Error("useWalletContext must be used within a WalletProvider");
    }
    return context;
};

interface WalletProviderProps {
    children: ReactNode;
}

export const WalletProvider: React.FC<WalletProviderProps> = ({ children }) => {
    const [isWalletOpen, setIsWalletOpen] = useState(false);
    const [activePanel, setActivePanel] = useState<WalletPanelType>("wallet");
    const [panelParams, setPanelParams] = useState<WalletPanelParams>({});

    const openWallet = () => {
        setIsWalletOpen(true);
        setActivePanel("wallet"); // Reset to the main wallet panel when opening
    };

    const closeWallet = () => setIsWalletOpen(false);
    const toggleWallet = () => setIsWalletOpen((prev) => !prev);

    // Navigate between panels within the wallet
    const navigateToPanel = (panel: WalletPanelType, params: WalletPanelParams = {}) => {
        setActivePanel(panel);
        setPanelParams(params);
        setIsWalletOpen(true); // Make sure wallet is open when navigating
    };

    return (
        <WalletContext.Provider
            value={{
                isWalletOpen,
                openWallet,
                closeWallet,
                toggleWallet,
                activePanel,
                panelParams,
                navigateToPanel,
            }}
        >
            {children}
        </WalletContext.Provider>
    );
};
