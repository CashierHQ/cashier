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

    const renderAmount = () => {
        if (isLoading) {
            return <Spinner width={22} />;
        }

        return (
            <div className="flex items-center">
                {showUsd && (
                    <>
                        <span>(${usdAmount?.toFixed(3)})</span>
                        <span className="ml-1">≈</span>
                    </>
                )}

                <span className="ml-1">{amount}</span>
                <span className="ml-1">{symbol}</span>
                <AssetAvatar className="ml-1" src={src} symbol={symbol} />
            </div>
        );
    };

    return (
        <div className="flex justify-between items-center">
            <h6>{title}</h6>

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
