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
        type: Object.values(ACTION_TYPE).includes(actionDTO.type as ACTION_TYPE)
            ? (actionDTO.type as ACTION_TYPE)
            : ACTION_TYPE.CREATE_LINK,
        intents: actionDTO.intents.map((intent) => ({
            id: intent.id,
            chain: Object.values(CHAIN).includes(intent.chain as CHAIN)
                ? (intent.chain as CHAIN)
                : CHAIN.IC,
            task: Object.values(TASK).includes(intent.task as TASK)
                ? (intent.task as TASK)
                : TASK.TRANSFER_WALLET_TO_LINK,
            type: Object.values(INTENT_TYPE).includes(intent.type as INTENT_TYPE)
                ? (intent.type as INTENT_TYPE)
                : INTENT_TYPE.TRANSFER_FROM,
            created_at: intent.created_at,
            state: Object.values(INTENT_STATE).includes(intent.state as INTENT_STATE)
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
    if (Object.values(INTENT_TYPE).includes(intentType as INTENT_TYPE)) {
        const item = metadata.find((item) => item[0].toLowerCase() === propName.toLowerCase());
        return {
            chain: (item?.[1] as { Wallet: AssetDto })?.Wallet?.chain ?? "Not found",
            address: (item?.[1] as { Wallet: AssetDto })?.Wallet?.address ?? "Not found",
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
    if (Object.values(INTENT_TYPE).includes(intentType as INTENT_TYPE)) {
        const item = metadata.find((item) => item[0].toLowerCase() === propName.toLowerCase());
        return {
            chain: (item?.[1] as { Asset: AssetDto })?.Asset?.chain ?? "Not found",
            address: (item?.[1] as { Asset: AssetDto })?.Asset?.address ?? "Not found",
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
    if (Object.values(INTENT_TYPE).includes(intentType as INTENT_TYPE)) {
        const item = metadata.find((item) => item[0].toLowerCase() === propName.toLowerCase());
        return (item?.[1] as { U64: bigint })?.U64?.valueOf() ?? BigInt(0);
    } else {
        return BigInt(1);
    }
};
