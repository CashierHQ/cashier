export enum TEMPLATE {
    LEFT = "Left",
    RIGHT = "Right",
    CENTRAL = "Central",
}

export enum LINK_STATE {
    // allow edit
    CHOOSE_TEMPLATE = "Link_state_choose_link_type",
    ADD_ASSET = "Link_state_add_assets",
    PREVIEW = "Link_state_preview",
    CREATE_LINK = "Link_state_create_link",
    // not allow edit
    ACTIVE = "Link_state_active",
    INACTIVE = "Link_state_inactive",
    INACTIVE_ENDED = "Link_state_inactive_ended",
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

export enum ACTION_STATE {
    CREATED = "Action_state_created",
    PROCESSING = "Action_state_processing",
    SUCCESS = "Action_state_success",
    FAIL = "Action_state_fail",
}

export enum INTENT_TYPE {
    TRANSFER_FROM = "TransferFrom",
    TRANSFER = "Transfer",
}

export enum LINK_ASSET_TYPE {
    CASHIER_FEE = "CashierFee",
    ASSET_ADDED = "Asset",
}

export enum FEE_TYPE {
    LINK_CREATION = "LinkCreation",
}

export function getLinkLabel(state: LINK_STATE): string {
    switch (state) {
        case LINK_STATE.CHOOSE_TEMPLATE:
            return "Draft"; // User left on step 1
        case LINK_STATE.ADD_ASSET:
            return "Draft"; // User left on step 2
        case LINK_STATE.PREVIEW:
            return "Draft"; // User left on step 3
        case LINK_STATE.CREATE_LINK:
            return "Draft"; // not Show on UI but should be draft here
        case LINK_STATE.ACTIVE:
            return "Active";
        case LINK_STATE.INACTIVE:
            return "Inactive";
        case LINK_STATE.INACTIVE_ENDED:
            return "Inactive";
        default:
            return "Unknown state";
    }
}

export function mapStringToLinkState(state: string): LINK_STATE {
    switch (state) {
        case "Link_state_choose_link_type":
            return LINK_STATE.CHOOSE_TEMPLATE;
        case "Link_state_add_assets":
            return LINK_STATE.ADD_ASSET;
        case "Link_state_preview":
            return LINK_STATE.PREVIEW;
        case "Link_state_create_link":
            return LINK_STATE.CREATE_LINK;
        case "Link_state_active":
            return LINK_STATE.ACTIVE;
        case "Link_state_inactive":
            return LINK_STATE.INACTIVE;
        case "Link_state_inactive_ended":
            return LINK_STATE.INACTIVE_ENDED;
        default:
            throw new Error(`Unknown link state: ${state}`);
    }
}

export enum LINK_TYPE {
    SEND_TIP = "SendTip",
    NFT_CREATE_AND_AIRDROP = "NftCreateAndAirdrop",
    SEND_AIRDROP = "SendAirdrop",
    SEND_TOKEN_BASKET = "SendTokenBasket",
    RECEIVE_PAYMENT = "ReceivePayment",
    RECEIVE_MULTI_PAYMENT = "ReceiveMultiPayment",
    SWAP_SINGLE_ASSET = "SwapSingleAsset",
    SWAP_MULTI_ASSET = "SwapMultiAsset",
}

export function getLinkTypeString(type: string): string {
    switch (type) {
        case LINK_TYPE.SEND_TIP:
            return "Send Tip";
        case LINK_TYPE.NFT_CREATE_AND_AIRDROP:
            return "NFT Create and Airdrop";
        case LINK_TYPE.SEND_AIRDROP:
            return "Send Airdrop";
        case LINK_TYPE.SEND_TOKEN_BASKET:
            return "Send Token Basket";
        case LINK_TYPE.RECEIVE_PAYMENT:
            return "Receive Payment";
        case LINK_TYPE.RECEIVE_MULTI_PAYMENT:
            return "Receive Multi Payment";
        case LINK_TYPE.SWAP_SINGLE_ASSET:
            return "Swap Single Asset";
        case LINK_TYPE.SWAP_MULTI_ASSET:
            return "Swap Multi Asset";
        default:
            throw new Error(`Unknown link type: ${type}`);
    }
}

export function mapStringToLinkType(type: string | undefined): LINK_TYPE | undefined {
    switch (type) {
        case "SendTip":
            return LINK_TYPE.SEND_TIP;
        case "NftCreateAndAirdrop":
            return LINK_TYPE.NFT_CREATE_AND_AIRDROP;
        case "SendAirdrop":
            return LINK_TYPE.SEND_AIRDROP;
        case "SendTokenBasket":
            return LINK_TYPE.SEND_TOKEN_BASKET;
        case "ReceivePayment":
            return LINK_TYPE.RECEIVE_PAYMENT;
        case "ReceiveMultiPayment":
            return LINK_TYPE.RECEIVE_MULTI_PAYMENT;
        case "SwapSingleAsset":
            return LINK_TYPE.SWAP_SINGLE_ASSET;
        case "SwapMultiAsset":
            return LINK_TYPE.SWAP_MULTI_ASSET;
        default:
            return undefined; // Return undefined for unknown types
    }
}

export enum CHAIN {
    IC = "IC",
}

export const mapStringToChain = (chain: string) => {
    switch (chain) {
        case CHAIN.IC:
            return CHAIN.IC;
        default:
            throw new Error("Unknown chain");
    }
};

export function mapStringToEnum<T extends object>(
    enumObject: T,
    value: string,
): T[keyof T] | undefined {
    return Object.values(enumObject).includes(value as T[keyof T])
        ? (value as T[keyof T])
        : undefined;
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
    USE_LINK = "Use",
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

export enum LINK_INTENT_ASSET_LABEL {
    INTENT_LABEL_LINK_CREATION_FEE = "LINK_CREATION_FEE", // fee transfer
    INTENT_LABEL_SEND_TIP_ASSET = "SEND_TIP_ASSET", // tip link
    INTENT_LABEL_SEND_AIRDROP_ASSET = "SEND_AIRDROP_ASSET", //
    INTENT_LABEL_SEND_TOKEN_BASKET_ASSET = "SEND_TOKEN_BASKET_ASSET", //
    INTENT_LABEL_RECEIVE_PAYMENT_ASSET = "RECEIVE_PAYMENT_ASSET", // payment link
}

export const mapStringToLabel = (label: string) => {
    switch (label) {
        case LINK_INTENT_ASSET_LABEL.INTENT_LABEL_LINK_CREATION_FEE:
            return LINK_INTENT_ASSET_LABEL.INTENT_LABEL_LINK_CREATION_FEE;
        case LINK_INTENT_ASSET_LABEL.INTENT_LABEL_SEND_TIP_ASSET:
            return LINK_INTENT_ASSET_LABEL.INTENT_LABEL_SEND_TIP_ASSET;
        case LINK_INTENT_ASSET_LABEL.INTENT_LABEL_SEND_AIRDROP_ASSET:
            return LINK_INTENT_ASSET_LABEL.INTENT_LABEL_SEND_AIRDROP_ASSET;
        case LINK_INTENT_ASSET_LABEL.INTENT_LABEL_RECEIVE_PAYMENT_ASSET:
            return LINK_INTENT_ASSET_LABEL.INTENT_LABEL_RECEIVE_PAYMENT_ASSET;
        default:
            return label;
    }
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const getAssetLabelForLinkType = (linkType: string) => {
    switch (linkType) {
        case LINK_TYPE.SEND_TIP:
            return LINK_INTENT_ASSET_LABEL.INTENT_LABEL_SEND_TIP_ASSET;
        case LINK_TYPE.SEND_AIRDROP:
            return LINK_INTENT_ASSET_LABEL.INTENT_LABEL_SEND_AIRDROP_ASSET;
        case LINK_TYPE.SEND_TOKEN_BASKET:
            return LINK_INTENT_ASSET_LABEL.INTENT_LABEL_SEND_TOKEN_BASKET_ASSET;
        case LINK_TYPE.RECEIVE_PAYMENT:
            return LINK_INTENT_ASSET_LABEL.INTENT_LABEL_RECEIVE_PAYMENT_ASSET;
        default:
            throw new Error("Unknown link type");
    }
};

export enum LINK_USER_STATE {
    NO_STATE = "No_state",
    CHOOSE_WALLET = "User_state_choose_wallet",
    COMPLETE = "User_state_completed_link",
}
