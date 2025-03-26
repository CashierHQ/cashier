import { ActionModel } from "@/services/types/action.service.types";
import { LinkDetailModel } from "@/services/types/link.service.types";
import { create } from "zustand";

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

export interface CreateLinkStoreData {
    link: LinkDetailModel | undefined;
    action: ActionModel | undefined;
    anonymousWalletAddress: string | undefined;

    setLink(data: LinkDetailModel | undefined): void;
    updateLink(data: Partial<LinkDetailModel>): void;

    setAction(action: ActionModel | undefined): void;
    setAnonymousWalletAddress(walletAddress: string): void;
    clearStore(): void;
}

export const useCreateLinkStore = create<CreateLinkStoreData>((set, get) => ({
    link: undefined,
    action: undefined,
    anonymousWalletAddress: undefined,

    setLink: (data) => set({ link: data }),
    updateLink: (data) => {
        const old = get().link;
        set({ link: { ...old!, ...data } });
    },

    setAction: (action) => set({ action }),
    setAnonymousWalletAddress: (walletAddress) => set({ anonymousWalletAddress: walletAddress }),
    clearStore: () =>
        set({ link: undefined, action: undefined, anonymousWalletAddress: undefined }),
}));
