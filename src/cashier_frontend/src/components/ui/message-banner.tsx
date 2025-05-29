import { Info } from "lucide-react";
import { cn } from "@/lib/utils";

type MessageBannerVariant = "info";

interface MessageBannerProps {
    variant: MessageBannerVariant;
    text: string;
    className?: string;
}

const variantStyles = {
    info: {
        icon: Info,
        textColor: "text-[#36a18b]",
        iconColor: "text-[#36a18b]",
    },
};

export function MessageBanner({ variant, text, className }: MessageBannerProps) {
    const Icon = variantStyles[variant].icon;

    return (
        <div className={cn("flex items-start justify-start gap-2 mt-1", className)}>
            <Icon className={cn("w-4 h-4 self-center", variantStyles[variant].iconColor)} />
            <p className={cn("leading-none mt-0.5 text-sm", variantStyles[variant].textColor)}>
                {text}
            </p>
        </div>
    );
}
