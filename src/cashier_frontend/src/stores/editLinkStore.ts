import { ActionModel } from "@/services/types/action.service.types";
import { LINK_TYPE } from "@/services/types/enum";
import { State, Template } from "@/services/types/link.service.types";
import { create } from "zustand";

export type TipLinkData = {
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

export type LinkData = TipLinkData; // TODO: add other types

export interface LinkCreateStoreData {
    data: LinkData | undefined;
    action: ActionModel | undefined;

    setData(data: LinkData): void;
    createAction(): void;
    processAction(): void;
}

export const useEditLinkStore = create((set) => ({
    data: undefined,
    action: undefined,

    setData: (data: LinkData) => {
        set({
            data,
        });
    },
}));
