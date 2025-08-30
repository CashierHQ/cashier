// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

// ...existing code...
import {
  IntentDto,
  IntentState,
  IntentTask,
  IntentType,
  TransferData,
  TransferFromData,
} from "../../../generated/cashier_backend/cashier_backend.did";
import { INTENT_STATE, INTENT_TYPE, TASK } from "../enum";
import {
  IntentModel,
  TransferDataModel,
  TransferFromDataModel,
} from "../intent.service.types";
import { mapChainToChainEnum } from ".";
import { assertNever, getKeyVariant } from ".";

// Mapper for Intent type (backend -> front-end INTENT_TYPE enum)
export const mapIntentTypeToEnum = (intentType: IntentType): INTENT_TYPE => {
  const key = getKeyVariant(intentType);
  switch (key) {
    case "TransferFrom":
      return INTENT_TYPE.TRANSFER_FROM;
    case "Transfer":
      return INTENT_TYPE.TRANSFER;
    default:
      return assertNever(key);
  }
};

// Mapper for Intent task (backend -> front-end TASK enum)
export const mapIntentTaskToEnum = (task: IntentTask): TASK => {
  const key = getKeyVariant(task);
  switch (key) {
    case "TransferWalletToLink":
      return TASK.TRANSFER_WALLET_TO_LINK;
    case "TransferWalletToTreasury":
      return TASK.TRANSFER_WALLET_TO_TREASURY;
    case "TransferLinkToWallet":
      return TASK.TRANSFER_LINK_TO_WALLET;
    default:
      return assertNever(key);
  }
};

// Mapper for Intent state (backend -> front-end INTENT_STATE enum)
export const mapIntentStateToEnum = (state: IntentState): INTENT_STATE => {
  const key = getKeyVariant(state);
  switch (key) {
    case "Created":
      return INTENT_STATE.CREATED;
    case "Processing":
      return INTENT_STATE.PROCESSING;
    case "Success":
      return INTENT_STATE.SUCCESS;
    case "Fail":
      return INTENT_STATE.FAIL;
    default:
      return assertNever(key);
  }
};

// Map back-end Intent DTO to Front-end Intent model
export const mapIntentDtoToIntentModel = (dto: IntentDto): IntentModel => {
  const typeDetails = mapIntentTypeDtoToModel(dto.type) as
    | TransferDataModel
    | TransferFromDataModel;

  return {
    id: dto.id,
    chain: mapChainToChainEnum(dto.chain),
    task: mapIntentTaskToEnum(dto.task),
    type: mapIntentTypeToEnum(dto.type),
    typeDetails,
    state: mapIntentStateToEnum(dto.state),
  };
};

// Convert backend IntentType variant into a normalized IntentTypeModel
export const mapIntentTypeDtoToModel = (
  intentType: IntentType,
): TransferDataModel | TransferFromDataModel => {
  const key = getKeyVariant(intentType);
  switch (key) {
    case "TransferFrom": {
      const data = (intentType as { TransferFrom: TransferFromData })
        .TransferFrom;

      const transferFrom: TransferFromDataModel = {
        to: { chain: "IC", address: data.to.IC.address.toString() },
        from: { chain: "IC", address: data.from.IC.address.toString() },
        asset: { chain: "IC", address: data.asset.IC.address.toString() },
        actual_amount: data.actual_amount?.[0] ?? undefined,
        amount: data.amount,
        approve_amount: data.approve_amount?.[0] ?? undefined,
        spender: data.spender
          ? { chain: "IC", address: data.spender.IC.address.toString() }
          : undefined,
      };

      return transferFrom;
    }

    case "Transfer": {
      const data = (intentType as { Transfer: TransferData }).Transfer;

      const transfer: TransferDataModel = {
        to: { chain: "IC", address: data.to.IC.address.toString() },
        from: { chain: "IC", address: data.from.IC.address.toString() },
        asset: { chain: "IC", address: data.asset.IC.address.toString() },
        amount: data.amount,
      };

      return transfer;
    }

    default:
      return assertNever(key);
  }
};
