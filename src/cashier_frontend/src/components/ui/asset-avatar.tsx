import * as React from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { FungibleToken } from "@/types/fungible-token.speculative";
import { ICP_TOKEN_ADDRESS, TEST_ICP_TOKEN_ADDRESS } from "@/services/fee.constants";

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
                <AvatarImage src={src} />
                <AvatarFallback>{symbol}</AvatarFallback>
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
        const icpToken = "/icpLogo.png";

        if (!token) {
            return (
                <Avatar ref={ref} className={cn("w-6 h-6", className)} {...props}>
                    <AvatarFallback>?</AvatarFallback>
                </Avatar>
            );
        }

        if (token.address === ICP_TOKEN_ADDRESS) {
            return (
                <Avatar ref={ref} className={cn("w-6 h-6", className)} {...props}>
                    <AvatarImage src={icpToken} />
                    <AvatarFallback>{token.logoFallback ?? token.symbol}</AvatarFallback>
                </Avatar>
            );
        }

        if (token.address === TEST_ICP_TOKEN_ADDRESS) {
            return (
                <Avatar ref={ref} className={cn("w-6 h-6", className)} {...props}>
                    <AvatarImage src={icpToken} />
                    <AvatarFallback>{token.logoFallback ?? token.symbol}</AvatarFallback>
                </Avatar>
            );
        }

        if (token.logoFallback) {
            return (
                <Avatar ref={ref} className={cn("w-6 h-6", className)} {...props}>
                    <AvatarImage src={token.logoFallback} />
                    <AvatarFallback>{token.symbol}</AvatarFallback>
                </Avatar>
            );
        }

        return (
            <Avatar ref={ref} className={cn("w-6 h-6", className)} {...props}>
                <AvatarImage src={token.logo} />
                <AvatarFallback>{token.symbol}</AvatarFallback>
            </Avatar>
        );
    },
);

AssetAvatar.displayName = "AssetAvatar";
