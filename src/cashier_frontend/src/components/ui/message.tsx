import { cn } from "@/lib/utils";
import { Info } from "lucide-react";
import { HTMLAttributes } from "react";

export interface MessageProps extends HTMLAttributes<HTMLDivElement> {}

export function Message({ children, className, ...props }: MessageProps) {
    return (
        <div className={cn("flex gap-1.5", className)} {...props}>
            <Info className="stroke-green min-w-4 min-h-4" size={16} />
            <p className="text-green">{children}</p>
        </div>
    );
}
