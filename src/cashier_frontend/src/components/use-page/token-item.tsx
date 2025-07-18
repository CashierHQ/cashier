// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

import React from "react";
import { LinkDetailModel } from "@/services/types/link.service.types";
import { AssetAvatarV2 } from "../ui/asset-avatar";
import { Avatar } from "@radix-ui/react-avatar";
import { formatDollarAmount, formatNumber } from "@/utils/helpers/currency";
import { FeeHelpers } from "@/services/fee.service";
import { cn } from "@/lib/utils";
import { useTokensV2 } from "@/hooks/token/useTokensV2";

interface TokenItemProps {
    link: LinkDetailModel;
    asset: LinkDetailModel["asset_info"][0];
    isLoading?: boolean;
}

const TokenItemSkeleton = () => {
    return (
        <div className="flex justify-between items-center animate-pulse">
            <div className="flex items-center gap-1.5">
                <div className="w-5 h-5 rounded-full bg-gray-200" />
                <div className="h-4 w-16 bg-gray-200 rounded" />
            </div>
            <div className="flex flex-col items-end">
                <div className="h-4 w-20 bg-gray-200 rounded mb-1" />
                <div className="h-3 w-16 bg-gray-200 rounded" />
            </div>
        </div>
    );
};

const TokenItem: React.FC<TokenItemProps> = ({ link, asset, isLoading = false }) => {
    const { getToken, getTokenPrice } = useTokensV2();
    const token = getToken(asset.address);

    if (isLoading) {
        return <TokenItemSkeleton />;
    }

    if (!token) {
        return (
            <div className="flex justify-between items-center">
                <p className="text-[14px] font-normal text-red-500">Token not found</p>
            </div>
        );
    }

    if (!link.linkType) {
        return (
            <div className="flex justify-between items-center">
                <p className="text-[14px] font-normal text-red-500">Link type not found</p>
            </div>
        );
    }

    const tokenAmountForecast = FeeHelpers.forecastActualAmountForLinkUsePage(
        link.linkType,
        token,
        asset.amountPerUse,
        Number(link.maxActionNumber),
    );

    const formattedTokenAmount = formatNumber(tokenAmountForecast.toString());
    const tokenSymbol = token?.symbol || asset.address;

    // Calculate approximate USD value
    const tokenPrice = getTokenPrice?.(asset.address) || 0;
    const approximateUsdValue = tokenAmountForecast * tokenPrice;

    return (
        <div
            className={cn(
                "flex justify-between items-center",
                isLoading && "opacity-50 pointer-events-none",
            )}
        >
            <div className="flex items-center gap-1.5">
                <Avatar className="w-5 h-5 rounded-full overflow-hidden">
                    <AssetAvatarV2 token={token} className="w-full h-full object-cover" />
                </Avatar>
                <p className="text-[14px] font-normal">{tokenSymbol}</p>
            </div>
            <div className="flex flex-col items-end">
                <div className="flex items-center gap-1">
                    <p className="text-[14px] font-normal">{formattedTokenAmount}</p>
                </div>
                <p className="text-[10px] font-normal text-grey-400/50">
                    {tokenPrice > 0
                        ? formatDollarAmount(approximateUsdValue)
                        : "No price available"}
                </p>
            </div>
        </div>
    );
};

export default TokenItem;
