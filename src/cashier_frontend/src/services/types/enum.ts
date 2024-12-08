export enum TEMPLATE {
    LEFT = "Left",
    RIGHT = "Right",
    CENTRAL = "Central",
}

export enum LINK_STATE {
    // allow edit
    CHOOSETEMPLATE = "Link_state_choose_link_type",
    ADD_ASSET = "Link_state_add_assets",
    CREATE_LINK = "Link_state_create_link",
    // not allow edit
    ACTIVE = "Link_state_active",
    INACTIVE = "Link_state_inactive",
}

export enum LINK_TYPE {
    NFT_CREATE_AND_AIRDROP = "NftCreateAndAirdrop",
}

export enum CHAIN {
    IC = "IC",
}
