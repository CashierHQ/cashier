// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

import { useEffect, useState } from "react";
import { AssetAvatar, AssetAvatarV2 } from "../ui/asset-avatar";
import Switch from "../ui/switch";
import { FungibleToken } from "@/types/fungible-token.speculative";
import { mapChainToLogo } from "@/utils/map/chain.map";
import { useTokensV2 } from "@/hooks/token/useTokensV2";

interface ManageTokensTokenItemProps {
    token: FungibleToken;
}

export function ManageTokensTokenItem({ token }: ManageTokensTokenItemProps) {
    // const { toggleTokenEnabled, isTogglingToken } = useTokenStore(identity);

    // Use token's enabled status from the API instead of local state
    const [isVisible, setIsVisible] = useState<boolean>(token.enabled ?? true);

    // Update local state if token props change
    useEffect(() => {
        setIsVisible(token.enabled ?? true);
    }, [token.enabled]);

    const { toggleTokenEnable } = useTokensV2();

    const handleToggle = async (e: React.MouseEvent) => {
        // Stop propagation to prevent the article onClick from firing
        e.stopPropagation();

        // Toggle the visibility state locally for immediate feedback
        const newVisibility = !isVisible;
        await toggleTokenEnable(token.id, newVisibility, token.chain);
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
