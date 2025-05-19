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

import { CHAIN, LINK_STATE, LINK_TYPE } from "@/services/types/enum";
import { create } from "zustand";

export interface UserInputAsset {
    address: string;
    // amount for one claim action (per-claim amount)
    linkUseAmount: bigint;
    chain: CHAIN;
    label: string;
    usdEquivalent?: number;
    usdConversionRate?: number;
}

export interface UserInputItem {
    linkId: string;
    state: LINK_STATE;
    title: string;
    linkType: LINK_TYPE;
    assets: UserInputAsset[];
    description?: string;
    image?: string;
    maxActionNumber: bigint;
}

export interface ButtonState {
    label: string;
    isDisabled: boolean;
    action: (() => Promise<void>) | (() => void) | null;
}

interface LinkCreationFormState {
    userInputs: Map<string, Partial<UserInputItem>>;
    // continue button state
    buttonState: ButtonState;

    getUserInput: (linkId: string) => Partial<UserInputItem> | undefined;

    addUserInput: (linkId: string, input: Partial<UserInputItem>) => void;
    updateUserInput: (linkId: string, input: Partial<UserInputItem>) => void;
    removeUserInput: (linkId: string) => void;
    clearStore: () => void;

    // Button state methods
    setButtonState: (buttonState: Partial<ButtonState>) => void;
    resetButtonState: () => void;
}

const defaultButtonState: ButtonState = {
    label: "Continue",
    isDisabled: true,
    action: null,
};

export const useLinkCreationFormStore = create<LinkCreationFormState>()((set, get) => ({
    userInputs: new Map(),
    buttonState: { ...defaultButtonState },

    addUserInput: (linkId, input) =>
        set((state) => {
            const newUserInputs = new Map(state.userInputs);
            newUserInputs.set(linkId, input);
            return { userInputs: newUserInputs };
        }),

    updateUserInput: (linkId, input) =>
        set((state) => {
            const newUserInputs = new Map(state.userInputs);
            if (newUserInputs.has(linkId)) {
                const updatedInput = { ...newUserInputs.get(linkId), ...input };
                newUserInputs.set(linkId, updatedInput);
            } else {
                newUserInputs.set(linkId, input);
            }
            return { userInputs: newUserInputs };
        }),

    removeUserInput: (linkId) =>
        set((state) => {
            const newUserInputs = new Map(state.userInputs);
            newUserInputs.delete(linkId);
            return { userInputs: newUserInputs };
        }),

    clearStore: () =>
        set({
            userInputs: new Map(),
            buttonState: { ...defaultButtonState },
        }),

    getUserInput: (linkId) => {
        return get().userInputs.get(linkId);
    },

    setButtonState: (buttonState) =>
        set((state) => ({
            buttonState: { ...state.buttonState, ...buttonState },
        })),

    resetButtonState: () =>
        set({
            buttonState: { ...defaultButtonState },
        }),
}));
