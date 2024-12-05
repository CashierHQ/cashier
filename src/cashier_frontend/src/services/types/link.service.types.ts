import { AssetAirdropInfo } from "../../../../declarations/cashier_backend/cashier_backend.did";

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

export type ActionModel = {
    arg: string;
    method: string;
    canister_id: string;
    label: string;
};

export type AssetInfoModel = {
    chain: string;
    address: string;
    amount: number;
};

export type UpdateLinkInput = {
    title: string;
    //++ assetInfo
    chain: Chain;
    amount: number;
    // -- assetInfo

    //++ action
    // -- action

    description: string;
    state: State;
    template: Template;
    image: string;
    create_at: Date;
};

// Need to update in future
export type LinkDetailModel = {
    id: string;
    title: string;
    description: string;
    image: string;
    link_type?: string;
    state?: string;
    template?: string;
    creator?: string;
    create_at: Date;
    asset_info?: AssetAirdropInfo;
};

export type TipLinkModel = {
    id: string;
    title: string;
    asset: string;
    amount: number;
};
