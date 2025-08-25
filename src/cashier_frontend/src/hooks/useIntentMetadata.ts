// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

import { IntentModel } from "@/services/types/intent.service.types";
import { useEffect, useState } from "react";

import { ACTION_TYPE, TASK } from "@/services/types/enum";
import { useTranslation } from "react-i18next";
import { useTokensV2 } from "./token/useTokensV2";

const getIntentTitle = (
  intent: IntentModel,
  actionType: ACTION_TYPE,
  t: (key: string) => string,
) => {
  if (
    actionType === ACTION_TYPE.CREATE_LINK &&
    intent.task === TASK.TRANSFER_WALLET_TO_LINK
  ) {
    return t("transaction.confirm_popup.asset_label");
  } else if (
    actionType === ACTION_TYPE.WITHDRAW_LINK &&
    intent.task === TASK.TRANSFER_LINK_TO_WALLET
  ) {
    return t("transaction.confirm_popup.asset_withdraw_label");
  } else if (
    actionType === ACTION_TYPE.USE_LINK &&
    intent.task === TASK.TRANSFER_LINK_TO_WALLET
  ) {
    return t("transaction.confirm_popup.asset_claim_label");
  } else if (
    actionType === ACTION_TYPE.USE_LINK &&
    intent.task === TASK.TRANSFER_WALLET_TO_LINK
  ) {
    return t("transaction.confirm_popup.asset_payment_label");
  }

  return "unknown intent title";
};

// TODO: handle for anonymous user
export const useIntentMetadata = (
  intent: IntentModel,
  actionType: ACTION_TYPE,
) => {
  const { getToken } = useTokensV2();
  const { t } = useTranslation();

  // Get token data directly from
  const token = getToken(intent.asset.address);

  const feeToken = getToken(intent.asset.address);

  const [assetAmount, setAssetAmount] = useState<number>();
  const [feeAmount, setFeeAmount] = useState<number>();

  useEffect(() => {
    if (token && token.decimals !== undefined) {
      // Calculate amounts using token data
      const rawAmount = intent.amount;
      setAssetAmount(Number(rawAmount) / 10 ** token.decimals);

      // Handle fee if present
      if (token.fee !== undefined) {
        setFeeAmount(Number(token.fee) / 10 ** token.decimals);
      }
    }
  }, [token, intent.amount]);

  return {
    assetAmount,
    assetSymbol: token?.symbol,
    assetSrc: token?.logo,
    feeAmount,
    feeSymbol: token?.symbol,
    feeIconSrc: feeToken?.logo,
    title: getIntentTitle(intent, actionType, t),
    isLoadingMetadata: !!token,
  };
};
