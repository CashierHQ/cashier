// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

// (convertNanoSecondsToDate not used here after switching to numeric create_at)
import {
  Asset,
  AssetInfoDto,
  CreateLinkInput,
  GetLinkResp,
  LinkDto,
  LinkGetUserStateOutput,
  LinkState,
  LinkType,
  LinkUserState,
  Template,
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
  LINK_STATE,
  LINK_TYPE,
  LINK_USER_STATE,
  mapStringToLabel,
  TEMPLATE,
} from "../enum";
import { fromNullable, toNullable } from "@dfinity/utils";
import { mapActionModel } from "./action.service.mapper";
import { UserInputAsset, UserInputItem } from "@/stores/linkCreationFormStore";
import { Principal } from "@dfinity/principal";
import { assertNever, getEnumKey, getKeyVariant } from ".";

export type LinkStateMachineGoto = UserStateMachineGoto;

const mapFrontendAssetToAsset = ({ address, chain }: UserInputAsset): Asset => {
  const key = getEnumKey(CHAIN, chain);
  switch (key) {
    case "IC":
      return { IC: { address: Principal.fromText(address) } };
    default:
      return assertNever(key);
  }
};

const mapFrontendAssetInfoToAssetInfo = (
  asset: UserInputAsset,
): AssetInfoDto => {
  return {
    asset: mapFrontendAssetToAsset(asset),
    amount_per_link_use_action: asset.linkUseAmount,
    label: asset.label,
  };
};

const mapFrontendTemplateToTemplate = (template: TEMPLATE): Template => {
  const key = getEnumKey(TEMPLATE, template);
  switch (key) {
    case "CENTRAL":
      return { Central: null };
    default:
      return assertNever(key);
  }
};

const mapFrontendLinkTypeToLinkType = (linkType: LINK_TYPE): LinkType => {
  const key = getEnumKey(LINK_TYPE, linkType);
  switch (key) {
    case "SEND_TIP":
      return { SendTip: null };
    case "NFT_CREATE_AND_AIRDROP":
      return { NftCreateAndAirdrop: null };
    case "SEND_AIRDROP":
      return { SendAirdrop: null };
    case "SEND_TOKEN_BASKET":
      return { SendTokenBasket: null };
    case "RECEIVE_PAYMENT":
      return { ReceivePayment: null };
    case "RECEIVE_MULTI_PAYMENT":
      return { ReceiveMutliPayment: null };
    case "SWAP_SINGLE_ASSET":
      return { SwapSingleAsset: null };
    case "SWAP_MULTI_ASSET":
      return { SwapMultiAsset: null };
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
    case "NftCreateAndAirdrop":
      return LINK_TYPE.NFT_CREATE_AND_AIRDROP;
    case "SendAirdrop":
      return LINK_TYPE.SEND_AIRDROP;
    case "SendTokenBasket":
      return LINK_TYPE.SEND_TOKEN_BASKET;
    case "ReceivePayment":
      return LINK_TYPE.RECEIVE_PAYMENT;
    case "ReceiveMutliPayment":
      return LINK_TYPE.RECEIVE_MULTI_PAYMENT;
    case "SwapSingleAsset":
      return LINK_TYPE.SWAP_SINGLE_ASSET;
    case "SwapMultiAsset":
      return LINK_TYPE.SWAP_MULTI_ASSET;
    default:
      return assertNever(key);
  }
};

export const mapLinkStateToEnum = (
  linkState: LinkState,
): LINK_STATE | undefined => {
  const key = getKeyVariant(linkState);
  switch (key) {
    case "Active":
      return LINK_STATE.ACTIVE;
    case "Preview":
      return LINK_STATE.PREVIEW;
    case "ChooseLinkType":
      return LINK_STATE.CHOOSE_TEMPLATE;
    case "AddAssets":
      return LINK_STATE.ADD_ASSET;
    case "CreateLink":
      return LINK_STATE.CREATE_LINK;
    case "Inactive":
      return LINK_STATE.INACTIVE;
    case "InactiveEnded":
      return LINK_STATE.INACTIVE_ENDED;
    default:
      return undefined;
  }
};

const mapTemplateToEnum = (template: Template): TEMPLATE | undefined => {
  const key = getKeyVariant(template);
  switch (key) {
    case "Central":
      return TEMPLATE.CENTRAL;
    default:
      return undefined;
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

const mapFrontendLinkStateToLinkState = (state: LINK_STATE): LinkState => {
  const key = getEnumKey(LINK_STATE, state);
  switch (key) {
    case "ACTIVE":
      return { Active: null };
    case "PREVIEW":
      return { Preview: null };
    case "CHOOSE_TEMPLATE":
      return { ChooseLinkType: null };
    case "ADD_ASSET":
      return { AddAssets: null };
    case "CREATE_LINK":
      return { CreateLink: null };
    case "INACTIVE":
      return { Inactive: null };
    case "INACTIVE_ENDED":
      return { InactiveEnded: null };
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
    case "CompletedLink":
      return LINK_USER_STATE.COMPLETE;
    case "ChooseWallet":
      return LINK_USER_STATE.CHOOSE_WALLET;
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
    params: [
      {
        title: toNullable(linkDetailModel.title),
        asset_info: linkDetailModel.assets
          ? linkDetailModel.assets.map((asset) =>
              mapFrontendAssetInfoToAssetInfo(asset),
            )
          : [],
        description: toNullable(linkDetailModel.description),
        template: toNullable(mapFrontendTemplateToTemplate(TEMPLATE.CENTRAL)),
        nft_image: [],
        link_image_url: [],
        link_type: linkDetailModel.linkType
          ? toNullable(mapFrontendLinkTypeToLinkType(linkDetailModel.linkType))
          : toNullable(),
        link_use_action_max_count: toNullable(linkDetailModel.maxActionNumber),
      },
    ],
  };

  return updateLinkInput;
};

const mapDtoToLinkDetailModel = (link: LinkDto): LinkDetailModel => {
  const linkType = fromNullable(link.link_type);
  const linkTemplate = fromNullable(link.template);

  const result: LinkDetailModel = {
    id: link.id,
    title: fromNullable(link.title) ?? "",
    description: fromNullable(link.description) ?? "",
    image: "",
    linkType: linkType ? mapLinkTypeToEnum(linkType) : undefined,
    state: link.state ? mapLinkStateToEnum(link.state) : undefined,
    template: linkTemplate ? mapTemplateToEnum(linkTemplate) : undefined,
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

export const mapPartialDtoToLinkDetailModel = (
  link: Partial<LinkDto>,
): LinkDetailModel => {
  // Title and description come as [] | [string] in the candid types

  const title: string =
    link.title && link.title.length > 0 ? (link.title[0] as string) : "";
  const description: string =
    link.description && link.description.length > 0
      ? (link.description[0] as string)
      : "";

  // link_type, template and state are optional candid variants
  const linkType: LINK_TYPE | undefined =
    link.link_type && link.link_type.length > 0
      ? mapLinkTypeToEnum(link.link_type[0] as LinkType)
      : undefined;
  const state: LINK_STATE | undefined = link.state
    ? mapLinkStateToEnum(link.state)
    : undefined;
  const template: TEMPLATE | undefined =
    link.template && link.template.length > 0
      ? mapTemplateToEnum(link.template[0] as Template)
      : undefined;

  // creator may be a Principal
  const creator: string | undefined = link.creator
    ? link.creator.toString()
    : undefined;

  // asset_info may be missing or empty
  const asset_info: AssetInfoModel[] =
    link.asset_info && link.asset_info.length > 0
      ? link.asset_info.map((a) => mapAssetInfoToFrontendAssetInfo(a))
      : [];

  const result: LinkDetailModel = {
    id: link.id ?? "",
    title,
    description,
    image: "",
    linkType,
    state,
    template,
    creator,
    create_at: link.create_at
      ? Number(link.create_at / 1000000n)
      : new Date("2000-10-01").getTime(),
    asset_info: asset_info,
    maxActionNumber: link.link_use_action_max_count ?? BigInt(0),
    useActionCounter: link.link_use_action_counter ?? BigInt(0),
  };
  return result;
};

// This method mapping LinkDetailModel to LinkDto - using for frontend state machine
export const mapLinkDetailModelToLinkDto = (
  model: LinkDetailModel,
): LinkDto => {
  if (!model.state) {
    throw new Error("Link state is undefined");
  }
  if (!model.creator) {
    throw new Error("Link creator is undefined");
  }

  const linkDto: LinkDto = {
    id: model.id,
    state: mapFrontendLinkStateToLinkState(model.state),
    title: model.title ? toNullable(model.title) : [],
    description: model.description ? toNullable(model.description) : [],
    link_type: model.linkType
      ? toNullable(mapFrontendLinkTypeToLinkType(model.linkType))
      : [],
    asset_info: model.asset_info.map((asset) =>
      mapFrontendAssetInfoModelToAssetInfo(asset),
    ),
    template: toNullable(mapFrontendTemplateToTemplate(TEMPLATE.CENTRAL)),
    creator: Principal.fromText(model.creator),
    create_at: model.create_at ? BigInt(model.create_at) * 1000000n : BigInt(0),
    metadata: [],
    link_use_action_counter: model.useActionCounter || BigInt(0),
    link_use_action_max_count: model.maxActionNumber || BigInt(0),
  };

  console.log("mapLinkDetailModelToLinkDto", linkDto);

  return linkDto;
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

// Map from UserInputItem to LinkDetailModel
export const mapUserInputItemToLinkDetailModel = (
  model: Partial<UserInputItem>,
): {
  id: string;
  title: string;
  description: string;
  image: string;
  linkType: LINK_TYPE;
  state: LINK_STATE;
  create_at: number;
  asset_info: AssetInfoModel[];
  maxActionNumber: bigint;
  useActionCounter: bigint;
  template: TEMPLATE;
} => {
  const assets =
    model.assets?.map(
      (asset): AssetInfoModel => ({
        address: asset.address,
        chain: asset.chain,
        label: asset.label,
        amountPerUse: asset.linkUseAmount,
      }),
    ) || [];

  return {
    id: model.linkId || "",
    title: model.title || "",
    description: model.description || "",
    image: model.image || "",
    linkType: model.linkType || LINK_TYPE.SEND_TIP, // Default to SEND_TIP for new links
    state: model.state || LINK_STATE.CHOOSE_TEMPLATE, // Default to CHOOSE_TEMPLATE for new links
    template: TEMPLATE.CENTRAL, // Default template
    asset_info: assets,
    maxActionNumber: model.maxActionNumber || BigInt(0),
    useActionCounter: BigInt(0), // Default to 0 for new links
    create_at: Date.now(), // Default to current date (ms) for new links
  };
};

export const mapPartialLinkDtoToCreateLinkInput = (
  dto: Partial<LinkDto>,
): CreateLinkInput => {
  // Build asset_info expected by CreateLinkInput
  const assetInfo: Array<{
    asset: Asset;
    amount_per_link_use_action: bigint;
    label: string;
  }> =
    dto.asset_info && dto.asset_info.length > 0
      ? dto.asset_info.map((a) => ({
          asset: a.asset,
          amount_per_link_use_action: a.amount_per_link_use_action,
          label: a.label,
        }))
      : [];
  // Ensure exact types required by CreateLinkInput
  const title: string =
    dto.title && dto.title.length > 0 ? (dto.title[0] as string) : "";
  const link_type: LinkType =
    dto.link_type && dto.link_type.length > 0
      ? (dto.link_type[0] as LinkType)
      : ({ SendTip: null } as LinkType);
  const description: [] | [string] =
    dto.description && dto.description.length > 0
      ? (dto.description as [string])
      : [];
  const template: Template =
    dto.template && dto.template.length > 0
      ? (dto.template[0] as Template)
      : ({ Central: null } as Template);

  return {
    title,
    asset_info: assetInfo,
    link_type,
    description,
    link_image_url: [],
    template,
    link_use_action_max_count: dto.link_use_action_max_count ?? BigInt(0),
    nft_image: [],
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
  const description: [] | [string] = model.description
    ? ([model.description] as [string])
    : [];
  let template: Template;
  if (
    model.template &&
    (Object.values(TEMPLATE) as string[]).includes(model.template)
  ) {
    template = mapFrontendTemplateToTemplate(
      model.template as unknown as TEMPLATE,
    );
  } else {
    template = { Central: null } as Template;
  }

  return {
    title,
    asset_info: assetInfo,
    link_type,
    description,
    link_image_url: [],
    template,
    link_use_action_max_count: model.maxActionNumber ?? BigInt(0),
    nft_image: [],
  };
};

// Map from LinkDto directly to UserInputItem
export const mapLinkDtoToUserInputItem = (dto: LinkDto): UserInputItem => {
  if (!dto.state) {
    throw new Error("Link state is undefined");
  }

  if (!dto.link_type || dto.link_type.length === 0) {
    throw new Error("Link type is undefined");
  }

  // dto.state is a LinkState variant; map to frontend LINK_STATE enum
  const mappedState = mapLinkStateToEnum(dto.state);
  // dto.link_type is [] | [LinkType]
  const candidLinkType =
    dto.link_type && dto.link_type.length > 0 ? dto.link_type[0] : undefined;
  const mappedLinkType = candidLinkType
    ? mapLinkTypeToEnum(candidLinkType)
    : undefined;

  if (!mappedState) {
    throw new Error("Link state is not valid");
  }

  if (!mappedLinkType) {
    throw new Error("Link type is not valid");
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
    state: mappedState,
    linkType: mappedLinkType,
    title: fromNullable(dto.title) ?? "",
    assets,
    description: fromNullable(dto.description) ?? "",
    image: "", // Not directly available in LinkDto
    maxActionNumber: dto.link_use_action_max_count,
  };
};
