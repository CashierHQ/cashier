// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

import React, { createContext, useContext, useState, ReactNode } from "react";

// Define panel types
type WalletPanelType =
  | "wallet"
  | "send"
  | "receive"
  | "details"
  | "manage"
  | "import"
  | "swap";

// Define panel params for navigation
type WalletPanelParams = {
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
  const navigateToPanel = (
    panel: WalletPanelType,
    params: WalletPanelParams = {},
  ) => {
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
