import { create } from "zustand";
import React, { useEffect } from "react";
import { PNP } from "@windoge98/plug-n-play";
import { GlobalPnpConfig } from "@/services/plugAndPlay/adapter";
import useWalletModalStore from "@/stores/walletModalStore";

const STORED_WALLET_KEY = "storedConnectWallet";

interface WalletAccount {
  owner: string | null;
  subaccount: string | null;
}

type StoreState = {
  pnp: PNP | null;
  account: WalletAccount | null;
  init: (config: GlobalPnpConfig) => void;
  connect: (walletId: string) => Promise<void>;
  disconnect: () => Promise<void>;
  reconnect: () => Promise<void>;
};

const usePnpStore = create<StoreState>()((set, get) => ({
  pnp: null,
  account: null,
  init: (config: GlobalPnpConfig) => {
    // create a single PNP instance and store it
    if (get().pnp) {
      console.warn("PNP is already initialized");
      return;
    }

    const pnp = new PNP(config);
    set({ pnp });
  },
  connect: async (walletId: string) => {
    const state = get() as StoreState;
    const { pnp } = state;
    if (!pnp) throw new Error("PNP not initialized. Call init(config) first.");
    const res = await pnp.connect(walletId);
    localStorage.setItem(STORED_WALLET_KEY, walletId);
    set({ account: res });
    // If a page set a post-login callback on the wallet modal, call it and clear it
    const onLogin = useWalletModalStore.getState().onLoginSuccess;
    if (onLogin) {
      try {
        onLogin();
      } catch (e) {
        console.error("onLoginSuccess callback threw:", e);
      }
      // Clear the callback using the store API
      useWalletModalStore.setState({ onLoginSuccess: null });
    }
  },
  disconnect: async () => {
    const state = get() as StoreState;
    const { pnp } = state;
    localStorage.removeItem(STORED_WALLET_KEY);
    if (pnp) await pnp.disconnect();
    set({ account: null });
  },
  reconnect: async () => {
    const state = get() as StoreState;
    const { pnp } = state;
    if (!pnp) return;
    const stored = localStorage.getItem(STORED_WALLET_KEY);
    if (!stored) return;
    try {
      const res = await pnp.connect(stored);
      console.log("PNP reconnect successful", res);
      set({ account: res });
      const onLogin = useWalletModalStore.getState().onLoginSuccess;
      if (onLogin) {
        try {
          onLogin();
        } catch (e) {
          console.error("onLoginSuccess callback threw:", e);
        }
        useWalletModalStore.setState({ onLoginSuccess: null });
      }
    } catch (e) {
      console.error("PNP reconnect failed", e);
      localStorage.removeItem(STORED_WALLET_KEY);
    }
  },
}));

// Small bootstrap component that initializes PNP and attempts reconnect on mount.
export const PnpBootstrap: React.FC = () => {
  const { reconnect } = usePnpStore();

  useEffect(() => {
    reconnect();
  }, []);

  return null;
};

export default usePnpStore;
