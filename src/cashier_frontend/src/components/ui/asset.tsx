import { FC } from "react";
import { AssetAvatar } from "../confirmation-popup/asset-avatar";

export type AssetProps = {
    title?: string | undefined;
    src?: string | undefined;
    symbol?: string | undefined;
    amount?: number | undefined;
};

export const Asset: FC<AssetProps> = ({ title, src, symbol, amount }) => {
    return (
        <div className="flex justify-between items-center">
            <h6>{title}</h6>

            <div className="flex items-center">
                <span>{amount}</span>
                <span className="ml-1">{symbol}</span>
                <AssetAvatar className="ml-1" src={src} symbol={symbol} />
            </div>
        </div>
    );
};
