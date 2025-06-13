// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

import { IntentModel } from "@/services/types/intent.service.types";
import { useEffect, useState } from "react";

import { TASK } from "@/services/types/enum";
import { useTranslation } from "react-i18next";
import { useTokens } from "@/hooks/useTokens";

const getIntentTitle = (intent: IntentModel, t: (key: string) => string) => {
    switch (intent.task) {
        case TASK.TRANSFER_WALLET_TO_LINK:
            return t("transaction.confirm_popup.asset_label");
        case TASK.TRANSFER_WALLET_TO_TREASURY:
            return t("transaction.confirm_popup.link_creation_fee_label");
        case TASK.TRANSFER_LINK_TO_WALLET:
            return t("transaction.confirm_popup.asset_claim_label");
    }
};

// TODO: handle for anonymous user
export const useIntentMetadata = (intent: IntentModel) => {
    const { getToken } = useTokens();
    const { t } = useTranslation();

    // Get token data directly from useTokens
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
        title: getIntentTitle(intent, t),
        isLoadingMetadata: !!token,
    };
};
