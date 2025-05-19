// Cashier — No-code blockchain transaction builder
// Copyright (C) 2025 TheCashierApp LLC
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with this program.  If not, see <https://www.gnu.org/licenses/>.

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
