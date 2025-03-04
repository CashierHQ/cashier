import { Search as LookingGlass } from "lucide-react";
import { Input } from "./input";
import { ComponentProps, forwardRef, HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export const SearchRoot = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
    ({ className, ...props }, ref) => {
        return <div ref={ref} className={cn("relative", className)} {...props} />;
    },
);

export const SearchIcon = forwardRef<SVGSVGElement, ComponentProps<typeof LookingGlass>>(
    ({ className, size = 24, ...props }, ref) => {
        return (
            <LookingGlass
                ref={ref}
                className={cn("absolute top-1/2 -translate-y-1/2 left-3 stroke-green", className)}
                size={size}
                {...props}
            />
        );
    },
);

export const SearchInput = forwardRef<HTMLInputElement, ComponentProps<typeof Input>>(
    ({ className, ...props }) => {
        return <Input className={cn("pl-11 py-2.5 h-auto]", className)} {...props} />;
    },
);

export const Search = {
    Root: SearchRoot,
    Icon: SearchIcon,
    Input: SearchInput,
};
