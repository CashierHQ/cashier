import { FC } from "react";
import { Spinner } from "./spinner";

export type FeeProps = {
    title?: string | undefined;
    amount?: number | undefined;
    usdAmount?: number | undefined;
    symbol?: string | undefined;

    isLoading?: boolean;
    isUsd?: boolean;
};

export const Fee: FC<FeeProps> = ({ title, amount, usdAmount, symbol, isLoading, isUsd }) => {
    const showUsd = isUsd && usdAmount !== undefined;

    const renderAmount = () => {
        if (isLoading) {
            return <Spinner width={22} />;
        }

        return (
            <div className="flex">
                + {showUsd && `($${usdAmount.toFixed(3)}) ≈ `}
                {amount} {symbol}
            </div>
        );
    };

    return (
        <div className="flex justify-between text-xs text-gray-500 leading-tight">
            <h6 id="transaction-title" className="text-right">
                {title}
            </h6>

            <div className="flex">{renderAmount()}</div>
        </div>
    );
};
