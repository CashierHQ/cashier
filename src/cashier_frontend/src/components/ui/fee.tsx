// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

import { act, FC } from "react";
import { Spinner } from "./spinner";
import { ACTION_TYPE } from "@/services/types/enum";
import { useLinkAction } from "@/hooks/useLinkAction";

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
    const { action } = useLinkAction();

    /*TODO: Remove after mid milestone*/
    const getSymbol = (title?: string) => {
        return title;
    };

    const getPrefixAmount = () => {
        if (action?.type === ACTION_TYPE.USE_LINK) {
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
