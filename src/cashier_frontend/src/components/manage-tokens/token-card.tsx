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

import { useEffect, useState } from "react";
import { AssetAvatar, AssetAvatarV2 } from "../ui/asset-avatar";
import Switch from "../ui/switch";
import { FungibleToken } from "@/types/fungible-token.speculative";
import { mapChainToLogo } from "@/utils/map/chain.map";
import { useTokens } from "@/hooks/useTokens";

export interface ManageTokensTokenProps {
    token: FungibleToken;
}

export function ManageTokensToken({ token }: ManageTokensTokenProps) {
    // const { toggleTokenEnabled, isTogglingToken } = useTokenStore(identity);

    // Use token's enabled status from the API instead of local state
    const [isVisible, setIsVisible] = useState<boolean>(token.enabled ?? true);

    // Update local state if token props change
    useEffect(() => {
        setIsVisible(token.enabled ?? true);
    }, [token.enabled]);

    const { toggleTokenVisibility } = useTokens();

    const handleToggle = (e: React.MouseEvent) => {
        // Stop propagation to prevent the article onClick from firing
        e.stopPropagation();

        // Toggle the visibility state locally for immediate feedback
        const newVisibility = !isVisible;
        setIsVisible(newVisibility);
        toggleTokenVisibility(token.id, !newVisibility);
    };

    return (
        <article className="flex justify-between items-center">
            <div className="flex gap-1.5 items-center">
                <div className="relative">
                    <AssetAvatarV2 token={token} className="w-[30px] h-[30px]" />
                    <AssetAvatar
                        src={mapChainToLogo(token.chain)}
                        symbol={token.chain}
                        className="w-3 h-3 absolute bottom-0 right-0 translate-y-1/2"
                    />
                </div>

                <div className="flex flex-col gap-1">
                    <span className="leading-4">{token.name}</span>
                    <span className="text-grey text-xs font-light leading-none">
                        {token.symbol}
                    </span>
                </div>
            </div>

            <Switch.Root checked={isVisible} onClick={handleToggle}>
                <Switch.Thumb />
            </Switch.Root>
        </article>
    );
}
