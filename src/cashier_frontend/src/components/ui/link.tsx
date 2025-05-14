import { cn } from "@/lib/utils";
import { ComponentProps, forwardRef } from "react";
import { Link as RouterLink } from "react-router-dom";

export const Link = forwardRef<HTMLAnchorElement, ComponentProps<typeof RouterLink>>(
    ({ className, ...props }, ref) => {
        return (
            <RouterLink
                ref={ref}
                className={cn("text-green font-medium hover:underline", className)}
                {...props}
            />
        );
    },
);
Link.displayName = "Link";

export const ExternalLink = forwardRef<HTMLAnchorElement, ComponentProps<typeof RouterLink>>(
    ({ className, ...props }, ref) => {
        return (
            <RouterLink
                ref={ref}
                className={cn("text-green font-medium hover:underline", className)}
                target="_blank"
                rel="noopener noreferrer"
                {...props}
            />
        );
    },
);
ExternalLink.displayName = "ExternalLink";
