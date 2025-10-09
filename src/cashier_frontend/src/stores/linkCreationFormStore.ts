// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

import { CHAIN, LINK_TYPE } from "@/services/types/enum";
import { create } from "zustand";

export interface UserInputAsset {
  address: string;
  linkUseAmount: bigint;
  chain: CHAIN;
  label: string;
  usdEquivalent?: number;
  usdConversionRate?: number;
}

export interface UserInputItem {
  linkId: string;
  title: string;
  linkType: LINK_TYPE;
  asset_info: UserInputAsset[];
  maxActionNumber: bigint;
}

interface ButtonState {
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

export const useLinkCreationFormStore = create<LinkCreationFormState>()(
  (set, get) => ({
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

    /**
     * Updates the button state with provided partial button state properties
     * @param buttonState - Partial button state properties to update (label, isDisabled, action)
     * @example
     * // Enable the button with a new label and action
     * setButtonState({
     *   label: "Submit",
     *   isDisabled: false,
     *   action: async () => await submitForm()
     * })
     */
    setButtonState: (buttonState) => {
      return set((state) => ({
        buttonState: { ...state.buttonState, ...buttonState },
      }));
    },

    resetButtonState: () =>
      set({
        buttonState: { ...defaultButtonState },
      }),
  }),
);
