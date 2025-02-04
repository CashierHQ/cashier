import {
    ActionDto,
    AssetDto,
    TypeMetdataValue,
} from "../../../../../declarations/cashier_backend/cashier_backend.did";
import { ACTION_TYPE, CHAIN, INTENT_STATE, INTENT_TYPE, TASK } from "../enum";
import { ActionModel } from "../refractor.action.service.types";
import { AssetModel, WalletModel } from "../refractor.intent.service.types";

// Map Action from back-end to front-end model
export const mapActionModel = (actionDTO: ActionDto): ActionModel => {
    return {
        id: actionDTO.id,
        creator: actionDTO.creator,
        type:
            actionDTO.type in ACTION_TYPE
                ? (actionDTO.type as ACTION_TYPE)
                : ACTION_TYPE.CREATE_LINK,
        intents: actionDTO.intents.map((intent) => ({
            id: intent.id,
            chain: intent.chain in CHAIN ? (intent.chain as CHAIN) : CHAIN.IC,
            task: intent.task in TASK ? (intent.task as TASK) : TASK.TRANSFER_WALLET_TO_LINK,
            type:
                intent.type in INTENT_TYPE
                    ? (intent.type as INTENT_TYPE)
                    : INTENT_TYPE.TRANSFER_FROM,
            created_at: intent.created_at,
            state:
                intent.state in INTENT_STATE
                    ? (intent.state as INTENT_STATE)
                    : INTENT_STATE.CREATED,
            from: mapMetadataToWalletModel(intent.type_metadata, intent.type, "from"),
            to: mapMetadataToWalletModel(intent.type_metadata, intent.type, "to"),
            asset: mapMetadataToAssetModel(intent.type_metadata, intent.type, "asset"),
            amount: mapMetadataToAmount(intent.type_metadata, intent.type, "amount"),
        })),
    };
};

const mapMetadataToWalletModel = (
    metadata: [string, TypeMetdataValue][],
    intentType: string,
    propName: string,
): WalletModel => {
    if (intentType in INTENT_TYPE) {
        const item = metadata.find((item) => item[0].toLowerCase() === propName.toLowerCase());
        return {
            chain: (item?.[1] as { Wallet: AssetDto })?.Wallet?.chain ?? "",
            address: (item?.[1] as { Wallet: AssetDto })?.Wallet?.address ?? "",
        };
    } else {
        return {
            address: "",
            chain: "",
        };
    }
};

const mapMetadataToAssetModel = (
    metadata: [string, TypeMetdataValue][],
    intentType: string,
    propName: string,
): AssetModel => {
    if (intentType in INTENT_TYPE) {
        const item = metadata.find((item) => item[0].toLowerCase() === propName.toLowerCase());
        return {
            chain: (item?.[1] as { Asset: AssetDto })?.Asset?.chain ?? "",
            address: (item?.[1] as { Asset: AssetDto })?.Asset?.address ?? "",
        };
    } else {
        return {
            address: "",
            chain: "",
        };
    }
};

const mapMetadataToAmount = (
    metadata: [string, TypeMetdataValue][],
    intentType: string,
    propName: string,
): bigint => {
    if (intentType in INTENT_TYPE) {
        const item = metadata.find((item) => item[0].toLowerCase() === propName.toLowerCase());
        return (item?.[1] as { U64: bigint })?.U64?.valueOf() ?? BigInt(0);
    } else {
        return BigInt(0);
    }
};
