// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

import { IntentCreateModel } from "./intent.service.types";
import { ActionModel } from "./action.service.types";
import { ACTION_TYPE, CHAIN, LINK_INTENT_ASSET_LABEL } from "./enum";

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
