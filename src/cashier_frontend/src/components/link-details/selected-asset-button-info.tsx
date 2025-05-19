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
import { Avatar } from "@/components/ui/avatar";
import { FungibleToken } from "@/types/fungible-token.speculative";
import { ChevronDown } from "lucide-react";
import { AssetAvatarV2 } from "../ui/asset-avatar";

type SelectedAssetButtonInfoProps = {
    selectedToken?: FungibleToken | null;
    showInput?: boolean;
};

export const SelectedAssetButtonInfo: FC<SelectedAssetButtonInfoProps> = ({
    selectedToken,
    showInput = true,
}) => {
    if (!selectedToken) {
        return null;
    }

    return (
        <div className="flex font-normal flex-grow items-center w-fit">
            <Avatar className="mr-2 w-6 h-6">
                <AssetAvatarV2 token={selectedToken} />
            </Avatar>
            <div id="asset-info" className="text-left flex gap-3 w-full leading-none items-center">
                <div className="text-[14px] font-normal">{selectedToken.name}</div>
                <ChevronDown
                    color="#36A18B"
                    strokeWidth={2}
                    size={22}
                    className={`${showInput ? "" : "ml-auto"}`}
                />
            </div>
        </div>
    );
};
