import * as React from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

type AssetAvatarProps = React.ComponentPropsWithoutRef<typeof Avatar> & {
    src?: string | undefined;
    symbol?: string | undefined;
};

export const AssetAvatar = React.forwardRef<React.ElementRef<typeof Avatar>, AssetAvatarProps>(
    ({ src, symbol, className, ...props }, ref) => {
        return (
            <Avatar ref={ref} className={cn("w-8 h-8 ml-3", className)} {...props}>
                <AvatarImage src={src} />
                <AvatarFallback>{symbol}</AvatarFallback>
            </Avatar>
        );
    },
);

AssetAvatar.displayName = "AssetAvatar";
