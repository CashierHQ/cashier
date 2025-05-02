import React from "react";
import { LinkDetailModel } from "@/services/types/link.service.types";
import { useTokenStore } from "@/stores/tokenStore";
import { AssetAvatar } from "../ui/asset-avatar";
interface TokenItemProps {
    asset: LinkDetailModel["asset_info"][0];
}

const TokenItem: React.FC<TokenItemProps> = ({ asset }) => {
    const { getToken } = useTokenStore();
    const token = getToken(asset.address);

    return (
        <div className="flex justify-between ml-1">
            <div className="flex items-center">
                <div className="flex gap-x-5 items-center">
                    <AssetAvatar
                        src={token?.logo}
                        symbol={token?.symbol}
                        className="w-10 h-10 rounded-sm mr-3"
                    />
                </div>
                <div className="mr-3">{token?.symbol || asset.address}</div>
            </div>
            <div className="text-green">{Number(asset.amountPerUse) / 10 ** 8}</div>
        </div>
    );
};

export default TokenItem;
