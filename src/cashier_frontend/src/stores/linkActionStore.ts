import { UpdateLinkParams } from "@/hooks/link-action-hooks";
import { ActionModel } from "@/services/types/action.service.types";
import { LinkDetailModel } from "@/services/types/link.service.types";
import { create } from "zustand";
import { ACTION_TYPE } from "@/services/types/enum";
import { LinkDto } from "../../../declarations/cashier_backend/cashier_backend.did";

// export interface ILinkModel<T extends LINK_TYPE> {
//     id: string;
//     title: string;
//     description: string;
//     state: State;
//     template: Template;
//     create_at: Date;
//     linkType: T;
// }

// export interface TipLinkModel extends ILinkModel<LINK_TYPE.TIP_LINK> {
//     tokenAddress: string;
//     amount: bigint;
// }

// export interface NftLinkModel extends ILinkModel<LINK_TYPE.NFT_CREATE_AND_AIRDROP> {
//     image: string;
// }

// export interface TokenBasketLinkModel extends ILinkModel<LINK_TYPE.TOKEN_BASKET> {
//     assets: { tokenAddress: string; amount: bigint }[];
// }

// export interface AirdropLinkModel extends ILinkModel<LINK_TYPE.AIRDROP> {
//     tokenAddress: string;
//     amount: bigint;
// }

// export type LinkModel = TipLinkModel | NftLinkModel | TokenBasketLinkModel | AirdropLinkModel;

export interface LinkActionStoreData {
    link: LinkDetailModel | undefined;
    action: ActionModel | undefined;
    anonymousWalletAddress: string | undefined;

    isLoading: boolean;
    isUpdating: boolean;
    isProcessingAction: boolean;
    setIsUpdating: (isUpdating: boolean) => void;
    setIsProcessingAction: (isProcessing: boolean) => void;
    setLoading: (isLoading: boolean) => void;
    setLink(data: LinkDetailModel | undefined): void;
    setAction(action: ActionModel | undefined): void;
    resetLinkAndAction(): void;
    updateLink(data: Partial<LinkDetailModel>): void;
    setAnonymousWalletAddress(walletAddress: string): void;
    clearStore(): void;
    getLinkDetail: () => Promise<void>;

    callLinkStateMachine(data: UpdateLinkParams): Promise<LinkDto>;

    createNewLink: (localLinkId: string) => Promise<
        | {
              id: string;
              oldId: string;
          }
        | undefined
    >;

    createAction: (
        linkId: string,
        actionType: ACTION_TYPE,
        actionId?: string,
    ) => Promise<ActionModel | undefined>;

    refetchLinkDetail: () => Promise<void>;
    refetchAction: () => Promise<void>;
}

export const useLinkActionStore = create<LinkActionStoreData>((set, get) => ({
    link: undefined,
    action: undefined,
    anonymousWalletAddress: undefined,
    currentLinkId: undefined,
    isLoading: false,
    isUpdating: false,
    isProcessingAction: false,
    setLoading: (isLoading) => set({ isLoading }),
    setIsUpdating: (isUpdating) => set({ isUpdating }),
    setIsProcessingAction: (isProcessing) => set({ isProcessingAction: isProcessing }),

    setLink: (data) => set({ link: data }),
    resetLinkAndAction: () => set({ link: undefined, action: undefined }),
    updateLink: (data) => {
        const old = get().link;
        set({ link: { ...old!, ...data } });
    },

    setAction: (action) => set({ action }),
    setAnonymousWalletAddress: (walletAddress) => set({ anonymousWalletAddress: walletAddress }),
    clearStore: () =>
        set({ link: undefined, action: undefined, anonymousWalletAddress: undefined }),

    getLinkDetail: async () => {
        throw new Error("Not implemented - will be set by useLinkAction hook");
    },

    callLinkStateMachine: async () => {
        throw new Error("Not implemented - will be set by useLinkAction hook");
    },

    createNewLink: async () => {
        throw new Error("Not implemented - will be set by useLinkAction hook");
    },

    createAction: async () => {
        throw new Error("Not implemented - will be set by useLinkAction hook");
    },

    refetchLinkDetail: async () => {
        throw new Error("Not implemented - will be set by useLinkAction hook");
    },

    refetchAction: async () => {
        throw new Error("Not implemented - will be set by useLinkAction hook");
    },
}));
