import { Info } from "lucide-react";
import { HTMLAttributes } from "react";

export interface MessageProps extends HTMLAttributes<HTMLDivElement> {}

export function Message({ children, ...props }: MessageProps) {
    return (
        <div className="flex gap-1.5" {...props}>
            <Info className="stroke-green min-w-4 min-h-4" size={16} />
            <p className="text-green">{children}</p>
        </div>
    );
}
