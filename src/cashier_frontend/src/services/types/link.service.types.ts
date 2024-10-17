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

export type LinkDetailModel = {
    id: string;
    title: string;
    description: string;
    image: string;
    link_type?: string;
    actions: [];
    state?: string;
    template?: string;
    creator: string;
    amount: number;
    chain?: string;
    create_at: Date;
    asset_info: AssetAirdropInfo;
};
