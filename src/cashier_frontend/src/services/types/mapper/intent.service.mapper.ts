// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

import { convertNanoSecondsToDate } from "@/utils";
import {
  AssetDto,
  IntentDto,
  MetadataValue,
} from "../../../generated/cashier_backend/cashier_backend.did";
import { CHAIN, INTENT_STATE, INTENT_TYPE, TASK } from "../enum";
import { AssetModel, IntentModel, WalletModel } from "../intent.service.types";

enum METADATA_PROP_NAMES {
  FROM = "from",
  TO = "to",
  ASSET = "asset",
  AMOUNT = "amount",
}

// Map back-end Intent DTO to Front-end Intent model
export const mapIntentDtoToIntentModel = (dto: IntentDto): IntentModel => {
  return {
    id: dto.id,
    chain: Object.values(CHAIN).includes(dto.chain as CHAIN)
      ? (dto.chain as CHAIN)
      : CHAIN.IC,
    task: Object.values(TASK).includes(dto.task as TASK)
      ? (dto.task as TASK)
      : TASK.TRANSFER_WALLET_TO_LINK,
    type: Object.values(INTENT_TYPE).includes(dto.type as INTENT_TYPE)
      ? (dto.type as INTENT_TYPE)
      : INTENT_TYPE.TRANSFER_FROM,
    createdAt: dto.created_at
      ? convertNanoSecondsToDate(dto.created_at)
      : new Date("2000-10-01"),
    state: Object.values(INTENT_STATE).includes(dto.state as INTENT_STATE)
      ? (dto.state as INTENT_STATE)
      : INTENT_STATE.CREATED,
    from: mapMetadataToWalletModel(
      dto.type_metadata,
      dto.type,
      METADATA_PROP_NAMES.FROM,
    ),
    to: mapMetadataToWalletModel(
      dto.type_metadata,
      dto.type,
      METADATA_PROP_NAMES.TO,
    ),
    asset: mapMetadataToAssetModel(
      dto.type_metadata,
      dto.type,
      METADATA_PROP_NAMES.ASSET,
    ),
    amount: mapMetadataFromNatToAmount(
      dto.type_metadata,
      dto.type,
      METADATA_PROP_NAMES.AMOUNT,
    ),
  };
};

const mapMetadataToWalletModel = (
  metadata: [string, MetadataValue][],
  intentType: string,
  propName: string,
): WalletModel => {
  if (Object.values(INTENT_TYPE).includes(intentType as INTENT_TYPE)) {
    const item = metadata.find(
      (item) => item[0].toLowerCase() === propName.toLowerCase(),
    );
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
  metadata: [string, MetadataValue][],
  intentType: string,
  propName: string,
): AssetModel => {
  if (Object.values(INTENT_TYPE).includes(intentType as INTENT_TYPE)) {
    const item = metadata.find(
      (item) => item[0].toLowerCase() === propName.toLowerCase(),
    );
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

// const mapMetadataToAmount = (
//     metadata: [string, MetadataValue][],
//     intentType: string,
//     propName: string,
// ): bigint => {
//     if (Object.values(INTENT_TYPE).includes(intentType as INTENT_TYPE)) {
//         const item = metadata.find((item) => item[0].toLowerCase() === propName.toLowerCase());
//         return (item?.[1] as { U64: bigint })?.U64?.valueOf() ?? BigInt(0);
//     } else {
//         return BigInt(0);
//     }
// };

const mapMetadataFromNatToAmount = (
  metadata: [string, MetadataValue][],
  intentType: string,
  propName: string,
): bigint => {
  if (Object.values(INTENT_TYPE).includes(intentType as INTENT_TYPE)) {
    const item = metadata.find(
      (item) => item[0].toLowerCase() === propName.toLowerCase(),
    );

    if (!item?.[1]) {
      return BigInt(0);
    }

    const value = item[1];

    // Handle Nat variant
    if ("Nat" in value) {
      return value.Nat;
    }

    // Handle MaybeNat variant
    if ("MaybeNat" in value) {
      // MaybeNat is [] | [bigint] - empty array means None, array with value means Some
      return value.MaybeNat.length > 0 ? value.MaybeNat[0]! : BigInt(0);
    }

    // Handle existing U64 variant for backward compatibility
    if ("U64" in value) {
      return value.U64;
    }

    return BigInt(0);
  } else {
    return BigInt(0);
  }
};
