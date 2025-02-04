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

export enum TRANSACTION_STATE {
    CREATED = "Transaction_state_created",
    PROCESSING = "Transaction_state_processing",
    SUCCESS = "Transaction_state_success",
    FAIL = "Transaction_state_fail",
    TIMEOUT = "Transaction_state_timeout",
}

export enum INTENT_STATE {
    CREATED = "Intent_state_created",
    PROCESSING = "Intent_state_processing",
    SUCCESS = "Intent_state_success",
    FAIL = "Intent_state_fail",
    TIMEOUT = "Intent_state_timeout",
}

export enum LINK_ASSET_TYPE {
    CASHIER_FEE = "CashierFee",
    ASSET_ADDED = "Asset",
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
    AIRDROP = "Airdrop",
    TOKEN_BASKET = "TokenBasket",
}

export enum CHAIN {
    IC = "IC",
}

export enum TASK {
    TRANSFER_WALLET_TO_TREASURY = "transfer_wallet_to_treasury",
    TRANSFER_WALLET_TO_LINK = "transfer_wallet_to_link",
    TRANSFER_LINK_TO_WALLET = "transfer_link_to_wallet",
}

export enum ACTION_TYPE {
    CREATE_LINK = "CreateLink",
    WITHDRAW_LINK = "Withdraw",
    CLAIM_LINK = "Claim",
}

export enum IC_TRANSACTION_PROTOCAL {
    ICRC1_TRANSFER = "ICRC1Transfer",
    ICRC2_TRANSFER = "ICRC2Transfer",
    ICRC2_APPROVE = "ICRC2Approve",
}

export enum WALLET {
    WALLET = "Wallet",
    CANISTER = "Canister",
}
