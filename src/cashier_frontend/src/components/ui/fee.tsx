// Cashier — No-code blockchain transaction builder
// Copyright (C) 2025 TheCashierApp LLC
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with this program.  If not, see <https://www.gnu.org/licenses/>.

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
