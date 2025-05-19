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
