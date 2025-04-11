import { act, FC } from "react";
import { Spinner } from "./spinner";
import { useLinkActionStore } from "@/stores/linkActionStore";
import { ACTION_TYPE } from "@/services/types/enum";

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
    const { action } = useLinkActionStore();

    /*TODO: Remove after mid milestone*/
    const getSymbol = (title?: string) => {
        if (title === "ICP") {
            return "ICP";
        } else if (title === "CUTE") {
            return "tCHAT";
        } else return title;
    };

    const getPrefixAmount = () => {
        if (action?.type === ACTION_TYPE.CLAIM_LINK) {
            return "-";
        }
        return "+";
    };

    const renderAmount = () => {
        if (isLoading) {
            return <Spinner width={22} />;
        }
        return (
            <div className="flex">
                {getPrefixAmount()} {showUsd && `($${usdAmount.toFixed(3)}) ≈ `}
                {amount} {getSymbol(symbol)}
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
