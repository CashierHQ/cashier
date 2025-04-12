import { LINK_STATE, LINK_TYPE } from "@/services/types/enum";
import { create } from "zustand";
import { persist, PersistOptions } from "zustand/middleware";

interface UserInputAsset {
    address: string;
    amount: bigint;
    usdEquivalent: number;
    usdConversionRate: number;
}

interface UserInputItem {
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

type LinkCreationPersist = Omit<
    PersistOptions<LinkCreationFormState>,
    "serialize" | "deserialize"
> & {
    serialize: (state: LinkCreationFormState) => string;
    deserialize: (str: string) => LinkCreationFormState;
};

export const useLinkCreationFormStore = create<LinkCreationFormState>()(
    persist(
        (set, get) => ({
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
        }),
        {
            name: "link-creation-store",
            serialize: (state: LinkCreationFormState) => {
                // Convert BigInt to string before storing in localStorage
                const serializedState = JSON.stringify(state, (key, value) =>
                    typeof value === "bigint" ? value.toString() : value,
                );
                return serializedState;
            },
            deserialize: (str: string) => {
                // Convert string back to BigInt when reading from localStorage
                const parsed = JSON.parse(str, (key, value) => {
                    // Check if the value is a string that could represent a BigInt
                    if (typeof value === "string" && /^\d+$/.test(value)) {
                        try {
                            return BigInt(value);
                        } catch {
                            return value;
                        }
                    }
                    return value;
                });
                return parsed;
            },
        } as LinkCreationPersist,
    ),
);
