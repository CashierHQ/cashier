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

interface TransactionItemProps {
    title: string;
    intent: IntentModel;
    isUsd?: boolean;
    fees?: FeeModel[];
    networkFee?: FeeModel;
}

// apply memo to prevent unnecessary re-renders
export const TransactionItem = memo(function TransactionItem({
    intent,
    fees = [],
}: TransactionItemProps) {
    const { assetAmount, assetSymbol, title: intentTitle } = useIntentMetadata(intent);
    const [adjustedAmount, setAdjustedAmount] = useState<number | undefined>(assetAmount);

    const { getToken, getTokenPrice } = useTokens();
    const token = getToken(intent.asset.address);
    const tokenUsdPrice = getTokenPrice(intent.asset.address);

    // Calculate adjusted amount by subtracting only the network fee
    useEffect(() => {
        if (assetAmount === undefined || !token) return;

        // Find the network fee for this token
        const networkFee = fees.find(
            (fee) => fee.address === intent.asset.address && fee.type === "network_fee",
        );

        // Calculate adjusted amount by subtracting only the network fee
        if (networkFee && token.decimals !== undefined) {
            // const networkFeeAmount = Number(networkFee.amount) / 10 ** token.decimals;
            const newAdjustedAmount = assetAmount;

            setAdjustedAmount(newAdjustedAmount);
        } else {
            setAdjustedAmount(assetAmount);
        }
    }, [assetAmount, fees, intent.asset.address, token]);

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
                <div
                    onClick={() => {
                        console.log("adjusted amount: ", adjustedAmount);
                    }}
                    className="flex flex-col items-end"
                >
                    <div className="flex items-center gap-1">
                        <p className="text-[14px] font-normal">
                            {formatNumber(adjustedAmount?.toString() || "0")}
                        </p>
                    </div>
                    <p className="text-[10px] font-normal text-grey/50">
                        {tokenUsdPrice && tokenUsdPrice > 0
                            ? formatDollarAmount(convert(adjustedAmount, tokenUsdPrice) || 0)
                            : "No price available"}
                    </p>
                </div>
            </div>

            {/* <div className="flex flex-col w-full"> */}
            {/* <Asset
                    title={intentTitle}
                    isLoading={isLoading}
                    amount={assetAmount}
                    usdAmount={convert(assetAmount, tokenUsdPrice)}
                    src={assetSrc}
                    symbol={assetSymbol}
                    isUsd={isUsd}
                /> */}

            {/* <Fee
                    title={t("transaction.confirm_popup.network_fee_label")}
                    isLoading={isLoading}
                    amount={feeAmount}
                    usdAmount={convert(feeAmount, tokenUsdPrice)}
                    symbol={feeSymbol}
                    isUsd={isUsd}
                /> */}
            {/* </div> */}
        </div>
    );
});
