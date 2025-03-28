import { FC } from "react";
import { AssetAvatar } from "@/components/ui/asset-avatar";
import { Spinner } from "@/components/ui/spinner";

export type AssetProps = {
    title?: string | undefined;
    src?: string | undefined;
    symbol?: string | undefined;
    amount?: number | undefined;
    usdAmount?: number | undefined;

    isLoading?: boolean;
    isUsd?: boolean;
};

export const Asset: FC<AssetProps> = ({
    title,
    src,
    symbol,
    amount,
    usdAmount,
    isLoading,
    isUsd,
}) => {
    const showUsd = isUsd && usdAmount !== undefined;

    //TODO: Remove after mid milestone
    const getAvatarSrc = (title: string, src: string) => {
        if (title === "ICP") {
            return "/icpLogo.png";
        } else if (title === "BTC") {
            return "/chatTokenLogo.png";
        } else return src;
    };

    const getSymbol = (title?: string) => {
        if (title === "ICP") {
            return "ICP";
        } else if (title === "CUTE") {
            return "tCHAT";
        } else return title;
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

                <span className="ml-1">{amount}</span>
                <span className="ml-1">{getSymbol(symbol)}</span>
                <AssetAvatar
                    className="ml-1"
                    src={getAvatarSrc(title ?? "", src ?? "")}
                    symbol={symbol}
                />
            </div>
        );
    };

    return (
        <div className="flex justify-between items-center font-normal">
            <h6 className="text-sm">{title}</h6>

            {renderAmount()}
            {/* {isLoading ? (
                <Spinner width={22} />
            ) : (
                <div className="flex items-center">
                    <span>{amount}</span>
                    <span className="ml-1">{symbol}</span>
                    <AssetAvatar className="ml-1" src={src} symbol={symbol} />
                </div>
            )} */}
        </div>
    );
};
