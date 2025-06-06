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

import React from "react";
import { LinkDetailModel } from "@/services/types/link.service.types";
import { useTokenStore } from "@/stores/tokenStore";
import { AssetAvatarV2 } from "../ui/asset-avatar";
import { Avatar } from "@radix-ui/react-avatar";
import { formatDollarAmount, formatNumber } from "@/utils/helpers/currency";

interface TokenItemProps {
    asset: LinkDetailModel["asset_info"][0];
}

const TokenItem: React.FC<TokenItemProps> = ({ asset }) => {
    const { getToken, getTokenPrice } = useTokenStore();
    const token = getToken(asset.address);

    const tokenDecimals = token?.decimals ?? 8;
    const tokenAmount = Number(asset.amountPerUse) / 10 ** tokenDecimals;
    const formattedTokenAmount = formatNumber(tokenAmount.toString());
    const tokenSymbol = token?.symbol || asset.address;

    // Calculate approximate USD value
    const tokenPrice = getTokenPrice?.(asset.address) || 0;
    const approximateUsdValue = tokenAmount * tokenPrice;

    return (
        <div className="flex justify-between items-center">
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
