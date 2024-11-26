import React from "react";
import { Input, InputProps } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface IconInputProps extends InputProps {
    icon: React.ReactNode;
}

const IconInput = React.forwardRef<HTMLInputElement, IconInputProps>(
    ({ className, icon, ...props }, ref) => {
        return (
            <div className="relative">
                <Input className={cn("pl-10", className)} ref={ref} {...props} />
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">{icon}</div>
            </div>
        );
    },
);

IconInput.displayName = "IconInput";

export { IconInput };
