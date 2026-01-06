// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

// (convertNanoSecondsToDate not used here after switching to numeric create_at)
import {
  AssetInfoDto,
  CreateLinkInput,
  GetLinkResp,
  LinkDto,
  LinkGetUserStateOutput,
  LinkState,
  LinkType,
  LinkUserState,
  UpdateLinkInput,
  UserStateMachineGoto,
} from "../../../generated/cashier_backend/cashier_backend.did";
import {
  AssetInfoModel,
  LinkDetailModel,
  LinkGetUserStateOutputModel,
  LinkModel,
} from "../link.service.types";
import {
  CHAIN,
  FRONTEND_LINK_STATE,
  LINK_STATE,
  LINK_TYPE,
  LINK_USER_STATE,
  mapStringToLabel,
} from "../enum";
import { fromNullable } from "@dfinity/utils";
import { mapActionModel } from "./action.service.mapper";
import { UserInputAsset, UserInputItem } from "@/stores/linkCreationFormStore";
import { Principal } from "@dfinity/principal";
import { assertNever, getEnumKey, getKeyVariant } from ".";

type LinkStateMachineGoto = UserStateMachineGoto;

const mapFrontendLinkTypeToLinkType = (linkType: LINK_TYPE): LinkType => {
  const key = getEnumKey(LINK_TYPE, linkType);
  switch (key) {
    case "SEND_TIP":
      return { SendTip: null };
    case "SEND_AIRDROP":
      return { SendAirdrop: null };
    case "SEND_TOKEN_BASKET":
      return { SendTokenBasket: null };
    case "RECEIVE_PAYMENT":
      return { ReceivePayment: null };
    default:
      return assertNever(key);
  }
};

export const mapFrontendGotoToUserStateMachineGoto = (
  goto: "Continue" | "Back",
): LinkStateMachineGoto => {
  const key = goto;
  switch (key) {
    case "Continue":
      return { Continue: null };
    case "Back":
      return { Back: null };
    default:
      return assertNever(key);
  }
};

const mapLinkTypeToEnum = (linkType: LinkType): LINK_TYPE => {
  const key = getKeyVariant(linkType);
  switch (key) {
    case "SendTip":
      return LINK_TYPE.SEND_TIP;
    case "SendAirdrop":
      return LINK_TYPE.SEND_AIRDROP;
    case "SendTokenBasket":
      return LINK_TYPE.SEND_TOKEN_BASKET;
    case "ReceivePayment":
      return LINK_TYPE.RECEIVE_PAYMENT;
    default:
      return assertNever(key);
  }
};

// Temporary type to assist in mapping LinkState (which is a union type) to our enum
type TemporaryLinkState =
  | LinkState
  | { Preview: null }
  | { ChooseLinkType: null }
  | { AddAssets: null };

export const mapLinkStateToEnum = (
  linkState: TemporaryLinkState,
): LINK_STATE | FRONTEND_LINK_STATE => {
  const key = getKeyVariant(linkState);
  switch (key) {
    case "ChooseLinkType":
      return FRONTEND_LINK_STATE.CHOOSE_TEMPLATE;
    case "AddAssets":
      return FRONTEND_LINK_STATE.ADD_ASSET;
    case "Preview":
      return FRONTEND_LINK_STATE.PREVIEW;
    case "Active":
      return LINK_STATE.ACTIVE;
    case "CreateLink":
      return LINK_STATE.CREATE_LINK;
    case "Inactive":
      return LINK_STATE.INACTIVE;
    case "InactiveEnded":
      return LINK_STATE.INACTIVE_ENDED;
    default:
      return assertNever(key);
  }
};

const mapLinkStateToDto = (
  linkState: LINK_STATE | FRONTEND_LINK_STATE,
): TemporaryLinkState => {
  switch (linkState) {
    case FRONTEND_LINK_STATE.CHOOSE_TEMPLATE:
      return { ChooseLinkType: null };
    case FRONTEND_LINK_STATE.ADD_ASSET:
      return { AddAssets: null };
    case FRONTEND_LINK_STATE.PREVIEW:
      return { Preview: null };
    case LINK_STATE.ACTIVE:
      return { Active: null };
    case LINK_STATE.CREATE_LINK:
      return { CreateLink: null };
    case LINK_STATE.INACTIVE:
      return { Inactive: null };
    case LINK_STATE.INACTIVE_ENDED:
      return { InactiveEnded: null };
    default:
      return assertNever(linkState);
  }
};

const mapAssetInfoToFrontendAssetInfo = (
  assetInfo: AssetInfoDto,
): AssetInfoModel => {
  const key = getKeyVariant(assetInfo.asset);
  console.log("[mapAssetInfoToFrontendAssetInfo] input:", assetInfo);
  switch (key) {
    case "IC":
      return {
        address: assetInfo.asset.IC.address.toString(),
        chain: CHAIN.IC,
        label: assetInfo.label,
        amountPerUse: assetInfo.amount_per_link_use_action,
      };
    default:
      return assertNever(key);
  }
};

const mapFrontendAssetInfoModelToAssetInfo = (
  asset: AssetInfoModel,
): AssetInfoDto => {
  switch (asset.chain) {
    case CHAIN.IC:
      return {
        asset: { IC: { address: Principal.fromText(asset.address) } },
        amount_per_link_use_action: asset.amountPerUse,
        label: asset.label,
      };
    default:
      return assertNever(asset.chain);
  }
};

const mapUserLinkStateToFrontendLinkUserState = (
  state: LinkUserState,
): LINK_USER_STATE => {
  const key = getKeyVariant(state);
  switch (key) {
    case "Completed":
      return LINK_USER_STATE.COMPLETED;
    case "Address":
      return LINK_USER_STATE.ADDRESS;
    case "GateOpened":
      return LINK_USER_STATE.GATE_OPENED;
    case "GateClosed":
      return LINK_USER_STATE.GATE_CLOSED;
    default:
      return assertNever(key);
  }
};

// Map front-end 'Link' model to back-end model
export const mapLinkDetailModelToUpdateLinkInputModel = (
  linkId: string,
  linkDetailModel: Partial<UserInputItem>,
  isContinue: boolean,
): UpdateLinkInput => {
  const updateLinkInput: UpdateLinkInput = {
    id: linkId,
    goto: mapFrontendGotoToUserStateMachineGoto(
      isContinue ? "Continue" : "Back",
    ),
  };

  return updateLinkInput;
};

export const mapDtoToLinkDetailModel = (link: LinkDto): LinkDetailModel => {
  const result: LinkDetailModel = {
    id: link.id,
    title: link.title,
    linkType: mapLinkTypeToEnum(link.link_type),
    state: mapLinkStateToEnum(link.state),
    creator: link.creator.toString(),
    create_at: link.create_at
      ? Number(link.create_at / 1000000n)
      : new Date("2000-10-01").getTime(),
    asset_info: link.asset_info.map((a) => {
      return mapAssetInfoToFrontendAssetInfo(a);
    }),
    maxActionNumber: link.link_use_action_max_count,
    useActionCounter: link.link_use_action_counter,
  };
  return result;
};

export const mapLinkDetailModelToDto = (link: LinkDetailModel): LinkDto => {
  const result: LinkDto = {
    id: link.id,
    title: link.title,
    link_type: mapFrontendLinkTypeToLinkType(link.linkType),
    state: mapLinkStateToDto(link.state) as LinkState,
    creator: Principal.fromText(link.creator || ""),
    create_at: BigInt(link.create_at * 1_000_000), // convert milliseconds to nanoseconds
    asset_info: link.asset_info.map((a) => {
      return mapFrontendAssetInfoModelToAssetInfo(a);
    }),
    link_use_action_max_count: link.maxActionNumber,
    link_use_action_counter: link.useActionCounter,
  };
  return result;
};

// Map back-end link detail ('GetLinkResp') to Front-end model
export const mapLinkDetailModel = async (
  linkObj: GetLinkResp,
): Promise<LinkModel> => {
  const { link: linkDto, action: linkObjAction } = linkObj;
  const actionDto = fromNullable(linkObjAction);
  return {
    action: actionDto ? mapActionModel(actionDto) : undefined,
    link: mapDtoToLinkDetailModel(linkDto),
  };
};

// Map back-end link user state to front-end model
export const mapLinkUserStateModel = (
  model: LinkGetUserStateOutput,
): LinkGetUserStateOutputModel => {
  return {
    action: model ? mapActionModel(model.action) : undefined,
    link_user_state: mapUserLinkStateToFrontendLinkUserState(
      model.link_user_state,
    ),
  };
};

// Map front-end LinkDetailModel directly to CreateLinkInput (used when creating a link from local model)
export const mapLinkDetailModelToCreateLinkInput = (
  model: LinkDetailModel,
): CreateLinkInput => {
  const assetInfo =
    model.asset_info && model.asset_info.length > 0
      ? model.asset_info.map((a) => mapFrontendAssetInfoModelToAssetInfo(a))
      : [];

  const title: string = model.title || "";
  const link_type: LinkType = model.linkType
    ? mapFrontendLinkTypeToLinkType(model.linkType)
    : ({ SendTip: null } as LinkType);

  return {
    title,
    asset_info: assetInfo,
    link_type,
    link_use_action_max_count: model.maxActionNumber ?? BigInt(0),
  };
};

// Map from LinkDto directly to UserInputItem
export const mapLinkDtoToUserInputItem = (dto: LinkDto): UserInputItem => {
  if (!dto.state) {
    throw new Error("Link state is undefined");
  }

  // Map assets if they exist
  const assets: UserInputAsset[] =
    dto.asset_info && dto.asset_info.length > 0
      ? dto.asset_info.map((asset) => ({
          address: asset.asset.IC.address.toText(),
          linkUseAmount: asset.amount_per_link_use_action,
          usdEquivalent: 0,
          usdConversionRate: 0,
          chain: CHAIN.IC,
          label: mapStringToLabel(asset.label),
        }))
      : [];

  return {
    linkId: dto.id,
    linkType: mapLinkTypeToEnum(dto.link_type),
    title: dto.title,
    asset_info: assets,
    maxActionNumber: dto.link_use_action_max_count,
  };
};
