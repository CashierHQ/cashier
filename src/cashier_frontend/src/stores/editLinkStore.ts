import { ConfirmTransactionModel } from "@/components/confirmation-drawer/confirmation-drawer";
import { ActionModel } from "@/services/types/action.service.types";
import { LINK_TYPE } from "@/services/types/enum";
import { State, Template } from "@/services/types/link.service.types";
import { create } from "zustand";

export type TipLinkModel = {
    id: string;
    title: string;
    description: string;
    state: State;
    template: Template;
    create_at: Date;
    amount: bigint;
    linkType: LINK_TYPE.TIP_LINK;
    tokenAddress: string;
};

export type LinkModel = TipLinkModel; // TODO: add other types

export interface LinkCreateStoreData {
    link: LinkModel | undefined;
    action: ActionModel | undefined;

    setLink(data: LinkModel | undefined): void;
    setAction(action: ActionModel | undefined): void;
}

export const useEditLinkStore = create<LinkCreateStoreData>((set) => ({
    link: undefined,
    action: undefined,
    confirmTransaction: undefined,

    setLink: (link) => set({ link }),
    setAction: (action) => set({ action }),
}));
