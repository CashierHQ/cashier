import React, { useEffect, useState } from "react";
import { LinkDetailModel } from "@/services/types/link.service.types";
import { getTokenImage } from "@/utils";
import { TokenUtilService } from "@/services/tokenUtils.service";
import { TokenMetadata } from "@/types/fungible-token.speculative";
import { IcrcTokenMetadata } from "@dfinity/ledger-icrc";
import { Loader2 } from "lucide-react";
import { useTokenStore } from "@/stores/tokenStore";
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
                    <img
                        src={token?.logo}
                        alt={token?.symbol}
                        className="w-10 h-10 rounded-sm mr-3"
                        onError={(e) => {
                            e.currentTarget.onerror = null;
                            e.currentTarget.src = `./defaultLinkImage.png`;
                        }}
                    />
                </div>
                <div className="mr-3">{token?.symbol || asset.address}</div>
            </div>
            <div className="text-green">{Number(asset.amountPerUse) / 10 ** 8}</div>
        </div>
    );
};

export default TokenItem;
