export enum TEMPLATE {
    LEFT = "Left",
    RIGHT = "Right",
    CENTRAL = "Central",
}

export enum LINK_STATE {
    // allow edit
    CHOOSE_TEMPLATE = "Link_state_choose_link_type",
    ADD_ASSET = "Link_state_add_assets",
    CREATE_LINK = "Link_state_create_link",
    // not allow edit
    ACTIVE = "Link_state_active",
    INACTIVE = "Link_state_inactive",
}

export function getLinkLabel(state: LINK_STATE): string {
    switch (state) {
        case LINK_STATE.CHOOSE_TEMPLATE:
            return "New";
        case LINK_STATE.ADD_ASSET:
            return "Pending details";
        case LINK_STATE.CREATE_LINK:
            return "Pending preview";
        case LINK_STATE.ACTIVE:
            return "Active";
        case LINK_STATE.INACTIVE:
            return "Inactive";
        default:
            return "Unknown state";
    }
}

export enum LINK_TYPE {
    NFT_CREATE_AND_AIRDROP = "NftCreateAndAirdrop",
    TIP_LINK = "TipLink",
}

export enum CHAIN {
    IC = "IC",
}
