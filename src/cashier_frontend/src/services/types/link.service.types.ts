import { IntentCreateModel } from "./intent.service.types";
import { ActionModel } from "./action.service.types";
import { ACTION_TYPE, CHAIN, LINK_INTENT_ASSET_LABEL } from "./enum";
import { LinkDto } from "../../../../declarations/cashier_backend/cashier_backend.did";

export enum State {
    New = "New",
    Inactive = "Inactive",
    Active = "Active",
    PendingPreview = "PendingPreview",
    PendingDetail = "PendingDetail",
    InactiveEnded = "InactiveEnded",
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
    amountPerUse: bigint;
    label?: LINK_INTENT_ASSET_LABEL | string;
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
    maxActionNumber: bigint;
    useActionCounter: bigint;
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
