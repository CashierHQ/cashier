// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

import * as React from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { FungibleToken } from "@/types/fungible-token.speculative";
import { ICP_TOKEN_ADDRESS, TEST_ICP_TOKEN_ADDRESS } from "@/services/fee.constants";
import CachedImage from "@/components/ui/cached-image";
import { ICP_LOGO } from "@/const";

type AssetAvatarProps = React.ComponentPropsWithoutRef<typeof Avatar> & {
    src?: string | undefined;

    /**
     * Symbol text that is displayed as fallback when image source is not found or while loading
     */
    symbol?: string | undefined;
};

export const AssetAvatar = React.forwardRef<React.ElementRef<typeof Avatar>, AssetAvatarProps>(
    ({ src, symbol, className, ...props }, ref) => {
        return (
            <Avatar ref={ref} className={cn("w-6 h-6", className)} {...props}>
                {src ? (
                    <div className="w-full h-full overflow-hidden rounded-full">
                        <CachedImage
                            src={src}
                            alt={symbol || "Token"}
                            className="w-full h-full object-cover"
                            fallback={<AvatarFallback>{symbol}</AvatarFallback>}
                        />
                    </div>
                ) : (
                    <AvatarFallback>{symbol}</AvatarFallback>
                )}
            </Avatar>
        );
    },
);

AssetAvatar.displayName = "AssetAvatar";

type AssetAvatarV2Props = React.ComponentPropsWithoutRef<typeof Avatar> & {
    token?: FungibleToken;
};

export const AssetAvatarV2 = React.forwardRef<React.ElementRef<typeof Avatar>, AssetAvatarV2Props>(
    ({ className, ...props }, ref) => {
        const { token } = props;

        if (!token) {
            return (
                <Avatar ref={ref} className={cn("w-6 h-6", className)} {...props}>
                    <AvatarFallback>?</AvatarFallback>
                </Avatar>
            );
        }

        let logoSrc = "";

        if (token.address === ICP_TOKEN_ADDRESS || token.address === TEST_ICP_TOKEN_ADDRESS) {
            logoSrc = ICP_LOGO;
        } else if (token.logoFallback) {
            logoSrc = token.logoFallback;
        } else {
            logoSrc = token.logo || "";
        }

        const fallbackSymbol = token.logoFallback ? token.symbol : token.symbol;

        return (
            <Avatar ref={ref} className={cn("w-6 h-6", className)} {...props}>
                <div className="w-full h-full overflow-hidden rounded-full">
                    <CachedImage
                        src={logoSrc}
                        alt={token.symbol}
                        className="w-full h-full object-cover"
                        fallback={<AvatarFallback>{fallbackSymbol}</AvatarFallback>}
                    />
                </div>
            </Avatar>
        );
    },
);

AssetAvatarV2.displayName = "AssetAvatarV2";
