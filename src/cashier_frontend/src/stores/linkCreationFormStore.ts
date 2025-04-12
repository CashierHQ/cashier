import { LINK_STATE, LINK_TYPE } from "@/services/types/enum";
import { create } from "zustand";
import { devtools } from "zustand/middleware";

export interface UserInputAsset {
    address: string;
    amount: bigint;
    totalClaim: bigint;
    usdEquivalent: number;
    usdConversionRate: number;
}

export interface UserInputItem {
    linkId: string;
    state: LINK_STATE;
    title: string;
    linkType: LINK_TYPE;
    assets: UserInputAsset[];
}

interface LinkCreationFormState {
    userInputs: UserInputItem[];

    addUserInput: (input: UserInputItem) => void;
    updateUserInput: (index: number, input: Partial<UserInputItem>) => void;
    removeUserInput: (index: number) => void;
    clearStore: () => void;
}

export const useLinkCreationFormStore = create<LinkCreationFormState>()((set) => ({
    userInputs: [],

    addUserInput: (input) =>
        set((state) => ({
            userInputs: [
                ...state.userInputs,
                {
                    linkId: input.linkId,
                    state: input.state,
                    title: input.title || "",
                    linkType: input.linkType || "",
                    assets: input.assets || [],
                },
            ],
        })),

    updateUserInput: (index, input) =>
        set((state) => {
            const newUserInput = [...state.userInputs];
            if (index >= 0 && index < newUserInput.length) {
                newUserInput[index] = { ...newUserInput[index], ...input };
            }
            return { userInputs: newUserInput };
        }),

    removeUserInput: (index) =>
        set((state) => {
            const newUserInput = [...state.userInputs];
            if (index >= 0 && index < newUserInput.length) {
                newUserInput.splice(index, 1);
            }
            return { userInputs: newUserInput };
        }),

    clearStore: () =>
        set({
            userInputs: [],
        }),
}));
