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
};
