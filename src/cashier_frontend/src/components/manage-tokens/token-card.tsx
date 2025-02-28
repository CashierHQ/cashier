import { useState } from "react";
import { AssetAvatar } from "../ui/asset-avatar";
import Switch from "../ui/switch";
import { FungibleToken } from "@/types/fungible-token.speculative";
import { mapChainToLogo } from "@/utils/map/chain.map";

export interface ManageTokensToken {
    token: FungibleToken;
}

export function ManageTokensToken({ token }: ManageTokensToken) {
    const [isVisible, setIsVisible] = useState<boolean>(true);
    const toggleVisible = () => setIsVisible((old) => !old);

    return (
        <article className="flex justify-between items-center" onClick={toggleVisible}>
            <div className="flex gap-1.5 items-center">
                <div className="relative">
                    <AssetAvatar
                        src={token.logo}
                        symbol={token.symbol}
                        className="w-[30px] h-[30px]"
                    />
                    <AssetAvatar
                        src={mapChainToLogo(token.chain)}
                        symbol={token.chain}
                        className="w-3 h-3 absolute bottom-0 right-0 translate-y-1/2"
                    />
                </div>

                <div className="flex flex-col">
                    <span>{token.name}</span>
                    <span className="text-grey">{token.symbol}</span>
                </div>
            </div>

            <Switch.Root checked={isVisible}>
                <Switch.Thumb />
            </Switch.Root>
        </article>
    );
}
