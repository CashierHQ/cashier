import * as React from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

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
