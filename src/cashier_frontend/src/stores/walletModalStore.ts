import { create } from "zustand";

// Store state and actions for the wallet connection modal
type WalletModalState = {
  // Whether the modal is open
  isOpen: boolean;
  // Functions to open/close the modal
  open: () => void;
  close: () => void;
  setOpen: (open: boolean) => void;
  // Optional callback to run after a successful login/connect
  onLoginSuccess: (() => void) | null;
  // Setter for the callback
  setOnLoginSuccess: (cb: (() => void) | null) => void;
};

const useWalletModalStore = create<WalletModalState>((set) => ({
  isOpen: false,
  open: () => set({ isOpen: true }),
  close: () => set({ isOpen: false }),
  setOpen: (open) => set({ isOpen: open }),
  onLoginSuccess: null,
  setOnLoginSuccess: (cb) => set({ onLoginSuccess: cb }),
}));

export default useWalletModalStore;
