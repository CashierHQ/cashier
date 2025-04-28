import React, { useEffect, useState } from "react";
import { LinkDetailModel } from "@/services/types/link.service.types";
import { getTokenImage } from "@/utils";
import { TokenUtilService } from "@/services/tokenUtils.service";
import { TokenMetadata } from "@/types/fungible-token.speculative";
import { IcrcTokenMetadata } from "@dfinity/ledger-icrc";
import { Loader2 } from "lucide-react";

interface TokenItemProps {
    asset: LinkDetailModel["asset_info"][0];
}

const TokenItem: React.FC<TokenItemProps> = ({ asset }) => {
    const tokenLogo = getTokenImage(asset.address);
    const [metadata, setMetadata] = useState<IcrcTokenMetadata | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const getTokenMetadata = async () => {
            const tokenMetadata = await TokenUtilService.getTokenMetadata(asset.address);
            return tokenMetadata;
        };
        getTokenMetadata().then((res) => {
            if (res) {
                console.log(`Res for ${asset.address}`, res);
                setMetadata(res);
            }
            setIsLoading(false);
        });
    }, []);

    return (
        <div className="flex justify-between ml-1">
            <div className="flex items-center">
                <div className="flex gap-x-5 items-center">
                    <img
                        src={tokenLogo}
                        alt={metadata?.symbol}
                        className="w-10 h-10 rounded-sm mr-3"
                        onError={(e) => {
                            e.currentTarget.onerror = null;
                            e.currentTarget.src = `./defaultLinkImage.png`;
                        }}
                    />
                </div>
                {isLoading ? (
                    <div className="mr-3">
                        <Loader2 className="animate-spin rounded-full h-4 w-4" color="green" />
                    </div>
                ) : (
                    <div className="mr-3">{metadata?.symbol}</div>
                )}
            </div>
            <div className="text-green">{Number(asset.amountPerUse) / 10 ** 8}</div>
        </div>
    );
};

export default TokenItem;
