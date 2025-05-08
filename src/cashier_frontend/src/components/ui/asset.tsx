import { FC } from "react";
import { AssetAvatarV2 } from "@/components/ui/asset-avatar";
import { Spinner } from "@/components/ui/spinner";
import { FungibleToken } from "@/types/fungible-token.speculative";

export type AssetProps = {
    title?: string | undefined;
    src?: string | undefined;
    amount?: number | undefined;
    usdAmount?: number | undefined;

    isLoading?: boolean;
    isUsd?: boolean;
    token?: FungibleToken;
};

export const Asset: FC<AssetProps> = ({
    title,
    src,
    amount,
    usdAmount,
    isLoading,
    isUsd,
    token,
}) => {
    const showUsd = isUsd && usdAmount !== undefined;

    //TODO: Remove after mid milestone
    const getAvatarSrc = (title: string, src: string) => {
        if (symbol === "ICP") {
            return "/icpLogo.png";
        } else if (title === "BTC") {
            return "/chatTokenLogo.png";
        } else return src;
    };

    const renderAmount = () => {
        if (isLoading) {
            return <Spinner width={22} />;
        }

        return (
            <div className="flex items-center rounded-lg">
                {showUsd && (
                    <>
                        <span>(${usdAmount?.toFixed(3)})</span>
                        <span className="ml-1">≈</span>
                    </>
                )}

                <span className="ml-1 font-light text-sm">{amount}</span>
                <span className="ml-1 font-light text-sm">{token?.symbol}</span>
                <AssetAvatarV2 token={token} className="ml-1" />
            </div>
        );
    };

    return (
        <div className="flex justify-between items-center font-normal">
            <h6 className="text-sm font-light">{title}</h6>

            {renderAmount()}
        </div>
    );
};
