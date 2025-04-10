import { IntentCreateModel } from "./intent.service.types";
import { ActionModel } from "./action.service.types";
import { ACTION_TYPE, CHAIN, LINK_INTENT_LABEL } from "./enum";

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
    totalClaim?: bigint;
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

export type LinkGetUserStateInputModel = {
    link_id: string;
    action_type: ACTION_TYPE;
    anonymous_wallet_address?: string;
};

export type LinkUpdateUserStateInputModel = {
    link_id: string;
    action_type: ACTION_TYPE;
    isContinue: boolean;
    anonymous_wallet_address?: string;
};

export type LinkGetUserStateOutputModel = {
    action: ActionModel | undefined;
    link_user_state: string | undefined;
};
