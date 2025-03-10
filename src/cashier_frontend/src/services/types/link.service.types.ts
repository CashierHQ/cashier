import { IntentCreateModel } from "./intent.service.types";
import { ActionModel } from "./action.service.types";
import { CHAIN, LINK_INTENT_LABEL } from "./enum";

export enum State {
    New = "New",
    Inactive = "Inactive",
    Active = "Active",
    PendingPreview = "PendingPreview",
    PendingDetail = "PendingDetail",
}

export enum Template {
    Left = "Left",
    Right = "Right",
    Central = "Central",
}

export enum Chain {
    IC = "IC",
}

export type AssetInfoModel = {
    address: string;
    amount: bigint;
    label?: LINK_INTENT_LABEL;
    chain?: CHAIN;
};

export type LinkDetailModel = {
    id: string;
    title: string;
    description: string;
    image: string;
    linkType?: string;
    state?: string;
    template?: string;
    creator?: string;
    create_at: Date;
    amountNumber: number;
    asset_info: AssetInfoModel[];
};

export type LinkModel = {
    link: LinkDetailModel;
    action?: ActionModel;
    intent_create?: IntentCreateModel;
};

export type TipLinkModel = {
    id: string;
    title: string;
    asset: string;
    amount: number;
};
