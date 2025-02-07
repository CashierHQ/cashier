import { cn } from "@/lib/utils";
import { ArrowUpDown } from "lucide-react";
import { FC } from "react";

type UsdSwitchProps = {
    amount: number | undefined;
    symbol: string | undefined;
    amountUsd: number | undefined;
    isUsd: boolean;
    onToggle: (isUsd: boolean) => void;
};

export const UsdSwitch: FC<UsdSwitchProps> = ({ isUsd, onToggle, amount, symbol, amountUsd }) => {
    const canConvert = amount !== undefined && amountUsd !== undefined;

    const renderMessage = () => {
        if (!canConvert) {
            return "No price available";
        }

        if (isUsd) {
            return `${amount?.toFixed(3)} ${symbol}`;
        } else {
            return `${amountUsd?.toFixed(3)} USD`;
        }
    };

    return (
        <button
            type="button"
            className={cn("flex  items-center", {
                "text-destructive": canConvert,
                "text-muted-foreground": !canConvert,
            })}
            onClick={() => canConvert && onToggle(!isUsd)}
        >
            <span className="text-sm leading-none">{renderMessage()}</span>

            {canConvert && <ArrowUpDown className="ml-1" size={16} />}
        </button>
    );
};
