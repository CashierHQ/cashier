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

import { memo } from "react";
import { IntentModel, FeeModel } from "@/services/types/intent.service.types";
import { Status } from "@/components/ui/status";
import { mapIntentsStateToStatus } from "@/utils/map/status.map";
import { useIntentMetadata } from "@/hooks/useIntentMetadata";
import { convert } from "@/utils/helpers/convert";
import { Avatar } from "@radix-ui/react-avatar";
import { formatDollarAmount, formatNumber } from "@/utils/helpers/currency";
import { AssetAvatarV2 } from "../ui/asset-avatar";
import { useTokens } from "@/hooks/useTokens";
import { useEffect, useState } from "react";
import { FeeHelpers } from "@/services/fee.service";
import { useLinkAction } from "@/hooks/useLinkAction";

interface TransactionItemProps {
    title: string;
    intent: IntentModel;
    isUsd?: boolean;
    fees?: FeeModel[];
    networkFee?: FeeModel;
    maxActionNumber?: number;
}

// apply memo to prevent unnecessary re-renders
export const TransactionItem = memo(function TransactionItem({
    intent,
    fees = [],
    maxActionNumber,
}: TransactionItemProps) {
    const { assetAmount, assetSymbol, title: intentTitle } = useIntentMetadata(intent);
    const [adjustedAmount, setAdjustedAmount] = useState<number | undefined>(assetAmount);

    const { getToken, getTokenPrice } = useTokens();
    const token = getToken(intent.asset.address);
    const tokenUsdPrice = getTokenPrice(intent.asset.address);
    const { link, action } = useLinkAction();

    // Calculate adjusted amount by subtracting only the network fee
    useEffect(() => {
        if (assetAmount === undefined || !token) return;

        // Find the network fee for this token
        const networkFee = fees.find(
            (fee) => fee.address === intent.asset.address && fee.type === "network_fee",
        );
        if (!link || !link.linkType) throw new Error("Link or linkType is undefined");
        if (!action || !action.type) throw new Error("Action or action type is undefined");

        if (FeeHelpers.shouldDisplayFeeBasedOnIntent(link.linkType, action.type, intent.task)) {
            // Calculate adjusted amount by subtracting only the network fee
            if (networkFee && token.decimals !== undefined) {
                const totalTokenAmount = FeeHelpers.getDisplayAmount(
                    token,
                    BigInt(intent.amount),
                    Number(maxActionNumber ?? 1),
                );
                console.log("Total token amount:", totalTokenAmount);
                setAdjustedAmount(totalTokenAmount);
            } else {
                const feeAmount = fees.find(
                    (fee) =>
                        fee.address === intent.asset.address && fee.type === "link_creation_fee",
                );

                setAdjustedAmount(Number(feeAmount?.amount) / 10 ** token.decimals);
            }
        } else {
            setAdjustedAmount(Number(intent.amount) / 10 ** token.decimals);
        }
    }, [assetAmount, fees, intent.asset.address, token]);

    const getDisplayAmount = () => {
        if (intentTitle.toLowerCase().includes("link creation fee")) {
            return (
                Number(FeeHelpers.getLinkCreationFee().amount) /
                10 ** FeeHelpers.getLinkCreationFee().decimals
            );
        }
        return formatNumber(adjustedAmount?.toString() || "0");
    };

    const getUsdAmount = () => {
        if (tokenUsdPrice && tokenUsdPrice > 0) {
            return formatDollarAmount(convert(adjustedAmount, tokenUsdPrice) || 0);
        }
        return "No price available";
    };

    return (
        <div className="flex items-center">
            {mapIntentsStateToStatus(intent.state) !== undefined && (
                <div className="mr-1.5">
                    <Status key={intent.id} status={mapIntentsStateToStatus(intent.state)} />
                </div>
            )}

            <div className="flex justify-between items-center w-full">
                <div className="flex items-center gap-1.5">
                    <Avatar className="w-5 h-5 rounded-full overflow-hidden">
                        <AssetAvatarV2 token={token} className="w-full h-full object-cover" />
                    </Avatar>
                    <p className="text-[14px] font-normal flex items-center gap-2">
                        {assetSymbol}
                        <span className="text-grey/60 text-[10px] font-normal">
                            {intentTitle.toLowerCase().includes("link creation fee")
                                ? "Link creation fee"
                                : ""}
                        </span>
                    </p>
                </div>
                <div className="flex flex-col items-end">
                    <div className="flex items-center gap-1">
                        <p className="text-[14px] font-normal">{getDisplayAmount()}</p>
                    </div>
                    <p className="text-[10px] font-normal text-grey/50">{getUsdAmount()}</p>
                </div>
            </div>
        </div>
    );
});
