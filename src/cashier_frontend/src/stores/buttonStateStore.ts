import { create } from "zustand";

interface ButtonState {
    isButtonDisabled: boolean;
    setButtonDisabled: (disabled: boolean) => void;
    clearStore: () => void;
}

export const useButtonStateStore = create<ButtonState>((set) => ({
    isButtonDisabled: false,
    setButtonDisabled: (disabled) => set({ isButtonDisabled: disabled }),
    clearStore: () => set({ isButtonDisabled: false }),
}));
