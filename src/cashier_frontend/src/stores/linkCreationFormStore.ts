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

interface LinkCreationFormState {
    userInputs: Map<string, Partial<UserInputItem>>;

    getUserInput: (linkId: string) => Partial<UserInputItem> | undefined;

    addUserInput: (linkId: string, input: Partial<UserInputItem>) => void;
    updateUserInput: (linkId: string, input: Partial<UserInputItem>) => void;
    removeUserInput: (linkId: string) => void;
    clearStore: () => void;
}

export const useLinkCreationFormStore = create<LinkCreationFormState>()((set, get) => ({
    userInputs: new Map(),

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
        }),

    getUserInput: (linkId) => {
        return get().userInputs.get(linkId);
    },
}));
