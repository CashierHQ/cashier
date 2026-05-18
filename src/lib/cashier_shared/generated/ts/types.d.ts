import { Principal } from '@icp-sdk/core/principal';
/**
 * Token standard for ICP tokens
 */
export declare const TokenStandard: {
    readonly ICRC1: "ICRC1";
    readonly ICRC2: "ICRC2";
};
export type TokenStandard = typeof TokenStandard[keyof typeof TokenStandard];
/**
 * Type of address in the system
 */
export declare const AddressType: {
    readonly Creator: "Creator";
    readonly User: "User";
    readonly Treasury: "Treasury";
    readonly Link: "Link";
};
export type AddressType = typeof AddressType[keyof typeof AddressType];
/**
 * Type of intent
 */
export declare const IntentType: {
    readonly Send: "Send";
    readonly Receive: "Receive";
};
export type IntentType = typeof IntentType[keyof typeof IntentType];
/**
 * Current state of an intent
 */
export declare const IntentState: {
    readonly Created: "Created";
    readonly Processing: "Processing";
    readonly Success: "Success";
    readonly Fail: "Fail";
};
export type IntentState = typeof IntentState[keyof typeof IntentState];
/**
 * Combination of source and destination for fee calculation
 */
export declare const IntentParticipants: {
    readonly CreatorToTreasury: "CreatorToTreasury";
    readonly CreatorToLink: "CreatorToLink";
    readonly UserToLink: "UserToLink";
    readonly LinkToUser: "LinkToUser";
    readonly LinkToCreator: "LinkToCreator";
};
export type IntentParticipants = typeof IntentParticipants[keyof typeof IntentParticipants];
/**
 * Type of action being performed
 */
export declare const ActionType: {
    readonly CreateLink: "CreateLink";
    readonly Withdraw: "Withdraw";
    readonly Send: "Send";
    readonly Receive: "Receive";
};
export type ActionType = typeof ActionType[keyof typeof ActionType];
/**
 * Current state of an action
 */
export declare const ActionState: {
    readonly Created: "Created";
    readonly Processing: "Processing";
    readonly Success: "Success";
    readonly Fail: "Fail";
};
export type ActionState = typeof ActionState[keyof typeof ActionState];
/**
 * Type of link
 */
export declare const LinkType: {
    readonly SendTip: "SendTip";
    readonly SendAirdrop: "SendAirdrop";
    readonly SendTokenBasket: "SendTokenBasket";
    readonly ReceivePayment: "ReceivePayment";
};
export type LinkType = typeof LinkType[keyof typeof LinkType];
/**
 * Current state of the link
 */
export declare const LinkState: {
    readonly ChooseType: "ChooseType";
    readonly AddAsset: "AddAsset";
    readonly Preview: "Preview";
    readonly Created: "Created";
    readonly Active: "Active";
    readonly Inactive: "Inactive";
    readonly Ended: "Ended";
};
export type LinkState = typeof LinkState[keyof typeof LinkState];
/**
 * Asset/Token reference
 */
export interface Asset {
    /** Canister ID of the token */
    address: Principal;
    /** Network fee for this asset in base units (Nat) */
    network_fee?: bigint;
    token_standard?: TokenStandard;
}
/**
 * Asset information with amount and label
 */
export interface AssetInfo {
    asset: Asset;
    /** Display label for the asset */
    label: string;
    /** Amount in base units (Nat) */
    amount: bigint;
    /** Available amount in base units (Nat) */
    available_amount?: bigint;
}
/**
 * Represents a single intent within an action
 */
export interface Intent {
    /** Unique identifier for the intent */
    id: string;
    intent_type: IntentType;
    asset: Asset;
    /** Amount to transfer */
    amount: bigint;
    /** Total amount to transfer */
    total_amount?: bigint;
    /** Network fee amount */
    network_fee?: bigint;
    /** User fee amount */
    user_fee?: bigint;
    /** Source address (Principal) */
    source_address: Principal;
    source_address_type: AddressType;
    /** Destination address (Principal) */
    dest_address: Principal;
    dest_address_type: AddressType;
    /** IDs of intents this intent depends on */
    dependencies?: string[];
    /** ID of the action this intent belongs to */
    action_id?: string;
    intent_state: IntentState;
}
/**
 * Input parameters for fee calculation
 */
export interface FeeCalculationInput {
    intent_participants: IntentParticipants;
    token_standard: TokenStandard;
    /** Amount entered by user */
    user_input_amount?: bigint;
    /** Maximum number of times the link can be used */
    max_use?: number;
    /** Fee for creating the link */
    link_creation_fee?: bigint;
    /** Network fee for the asset */
    asset_network_fee: bigint;
    /** Maximum asset amount in the link (for withdrawals) */
    link_max_asset_amount?: bigint;
}
/**
 * Result of fee calculation for an intent
 */
export interface FeeCalculationResult {
    /** Total amount for the intent */
    intent_total_amount: bigint;
    /** Total network fee (inbound + outbound) */
    intent_total_network_fee: bigint;
    /** Fee paid by the user */
    intent_user_fee: bigint;
}
/**
 * Represents an action containing multiple intents
 */
export interface Action {
    /** Unique identifier for the action */
    id: string;
    /** Principal of the action creator */
    creator: Principal;
    /** Type of creator address */
    creator_address_type: AddressType;
    /** Type of action being performed */
    action_type: ActionType;
    /** List of intents that make up this action */
    intents: Intent[];
    /** Current state of the action */
    action_state: ActionState;
    /** ID of the link associated with this action, if any */
    link_id?: string;
    /** List of intent IDs associated with this action */
    intent_ids?: string[];
}
/**
 * Represents a link
 */
export interface Link {
    /** Unique identifier for the link */
    id: string;
    /** Principal of the link creator */
    creator: Principal;
    /** Title of the link */
    title: string;
    link_type: LinkType;
    /** List of assets associated with the link */
    asset_info: AssetInfo[];
    /** Maximum number of times the link can be used */
    max_use: bigint;
    /** Number of times the link has been used */
    use_count: bigint;
    link_state: LinkState;
    /** Creation timestamp in nanoseconds since Unix epoch (IC time) */
    created_at?: bigint;
}
//# sourceMappingURL=types.d.ts.map