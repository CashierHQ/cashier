import React from "react";
import { LinkDetailModel } from "@/services/types/link.service.types";
import { useTokenStore } from "@/stores/tokenStore";
import { AssetAvatarV2 } from "../ui/asset-avatar";
import { Avatar } from "@radix-ui/react-avatar";
import { formatPrice } from "@/utils/helpers/currency";

interface TokenItemProps {
    asset: LinkDetailModel["asset_info"][0];
}

const TokenItem: React.FC<TokenItemProps> = ({ asset }) => {
    const { getToken, getTokenPrice } = useTokenStore();
    const token = getToken(asset.address);

    const tokenDecimals = token?.decimals ?? 8;
    const tokenAmount = Number(asset.amountPerUse) / 10 ** tokenDecimals;
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
                    <p className="text-[14px] font-normal">{tokenAmount}</p>
                </div>
                <p className="text-[10px] font-normal text-grey-400/50">
                    {tokenPrice > 0
                        ? `~${formatPrice(approximateUsdValue.toString())}`
                        : "No price available"}
                </p>
            </div>
        </div>
    );
};

export default TokenItem;
