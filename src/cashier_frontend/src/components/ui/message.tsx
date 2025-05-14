import { cn } from "@/lib/utils";
import { Info } from "lucide-react";
import { HTMLAttributes } from "react";

export interface MessageProps extends HTMLAttributes<HTMLDivElement> {}

export function Message({ children, className, ...props }: MessageProps) {
    return (
        <div className={cn("flex place-items-start", className)} {...props}>
            <Info className="text-green mr-2" size={22} />
            <p className="text-green w-fit text-[14px]">{children}</p>
        </div>
    );
}
