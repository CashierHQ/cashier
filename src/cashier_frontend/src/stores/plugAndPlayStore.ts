import { create } from "zustand";
import { devtools } from "zustand/middleware";
import React, { useEffect } from "react";
import { PNP } from "@windoge98/plug-n-play";
import { WalletAccount } from "node_modules/@windoge98/plug-n-play/dist/src/types/WalletTypes";
import { GlobalPnpConfig } from "@/services/plugAndPlay/adapter";

const STORED_WALLET_KEY = "storedConnectWallet";

type StoreState = {
  pnp: PNP | null;
  account: WalletAccount | null;
  init: (config: GlobalPnpConfig) => void;
  connect: (walletId: string) => Promise<void>;
  disconnect: () => Promise<void>;
  reconnect: () => Promise<void>;
};

const usePnpStore = create<StoreState>()(
  devtools((set, get) => ({
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
      if (!pnp)
        throw new Error("PNP not initialized. Call init(config) first.");
      const res = await pnp.connect(walletId);
      localStorage.setItem(STORED_WALLET_KEY, walletId);
      set({ account: res });
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
      } catch (e) {
        console.error("PNP reconnect failed", e);
        localStorage.removeItem(STORED_WALLET_KEY);
      }
    },
  })),
);

// Small bootstrap component that initializes PNP and attempts reconnect on mount.
export const PnpBootstrap: React.FC = () => {
  const { reconnect } = usePnpStore();

  useEffect(() => {
    reconnect();
  }, []);

  return null;
};

export default usePnpStore;
