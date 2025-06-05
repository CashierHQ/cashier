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

import { FC, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { TransactionItem } from "@/components/transaction/transaction-item";
import { IntentModel, FeeModel } from "@/services/types/intent.service.types";
import { TASK, FEE_TYPE } from "@/services/types/enum";
import { feeService } from "@/services/fee.service";
import { useTokens } from "@/hooks/useTokens";
import { useLinkAction } from "@/hooks/useLinkAction";

type ConfirmationPopupAssetsSectionProps = {
    intents: IntentModel[];
    onInfoClick?: () => void;
    isUsd?: boolean;
    onUsdClick?: () => void;
};

const getLabel = (intent: IntentModel) => {
    switch (intent.task) {
        case TASK.TRANSFER_WALLET_TO_LINK:
        case TASK.TRANSFER_WALLET_TO_TREASURY:
            return "confirmation_drawer.send_label";
        case TASK.TRANSFER_LINK_TO_WALLET:
            return "confirmation_drawer.receive_label";
        default:
            return "confirmation_drawer.send_label";
    }
};

// Sort intents by fee last, then by address
const sortIntentsByAddress = (intents: IntentModel[]): IntentModel[] => {
    return [...intents].sort((a, b) => {
        // First prioritize fees (TRANSFER_WALLET_TO_TREASURY) to show at the bottom
        const aIsFee = a.task === TASK.TRANSFER_WALLET_TO_TREASURY;
        const bIsFee = b.task === TASK.TRANSFER_WALLET_TO_TREASURY;

        if (aIsFee && !bIsFee) return 1; // Fee comes last (at the bottom)
        if (!aIsFee && bIsFee) return -1; // Non-fee comes first

        // If both are fees or both are not fees, then sort by address
        if (a.asset.address < b.asset.address) return -1;
        if (a.asset.address > b.asset.address) return 1;

        return 0;
    });
};

export const ConfirmationPopupAssetsSection: FC<ConfirmationPopupAssetsSectionProps> = ({
    intents,
    isUsd,
}) => {
    const { t } = useTranslation();
    const { getToken } = useTokens();
    const { link } = useLinkAction();
    const [feesMap, setFeesMap] = useState<Map<string, FeeModel[]>>(new Map());
    const [sortedIntents, setSortedIntents] = useState<IntentModel[]>([]);

    // Sort intents and calculate fees
    useEffect(() => {
        // Sort intents by address with fees last
        setSortedIntents(sortIntentsByAddress(intents));

        const calculateFees = async () => {
            const newFeesMap = new Map<string, FeeModel[]>();

            // Process each intent to get associated fees
            for (const intent of intents) {
                const tokenAddress = intent.asset.address;
                const token = getToken(tokenAddress);

                if (!token) continue;

                // Get existing fees for this token or initialize empty array
                const tokenFees = newFeesMap.get(tokenAddress) || [];

                // Network fee for this token
                if (token.fee) {
                    tokenFees.push({
                        chain: intent.asset.chain,
                        type: "network_fee",
                        address: tokenAddress,
                        amount: token.fee,
                    });
                }

                // Link creation fee if applicable
                if (intent.task === TASK.TRANSFER_WALLET_TO_TREASURY && link) {
                    const linkCreationFee = feeService.getFee(
                        intent.asset.chain,
                        link.linkType!,
                        FEE_TYPE.LINK_CREATION,
                    );

                    if (linkCreationFee) {
                        tokenFees.push({
                            chain: intent.asset.chain,
                            type: "link_creation_fee",
                            address: tokenAddress,
                            amount: linkCreationFee.amount,
                        });
                    }
                }

                if (tokenFees.length > 0) {
                    newFeesMap.set(tokenAddress, tokenFees);
                }
            }

            setFeesMap(newFeesMap);
        };

        calculateFees();
    }, [intents, getToken, link]);

    return (
        <section id="confirmation-popup-section-send" className="my-3">
            <div className="flex items-center w-full justify-between">
                <h2 className="font-medium text-[14px] ml-2">{t(getLabel(intents[0]))}</h2>
            </div>

            <ol className="flex flex-col gap-3 light-borders-green px-4 py-3 overflow-y-auto max-h-[200px]">
                {sortedIntents.map((intent) => (
                    <li key={intent.id}>
                        <TransactionItem
                            key={intent.id}
                            title={t("confirmation_drawer.asset_label")}
                            intent={intent}
                            isUsd={isUsd}
                            fees={feesMap.get(intent.asset.address) || []}
                        />
                    </li>
                ))}
            </ol>
        </section>
    );
};
