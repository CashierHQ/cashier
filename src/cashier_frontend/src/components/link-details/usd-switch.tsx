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
    return (
        <button
            type="button"
            className="flex text-destructive items-center"
            onClick={() => onToggle(!isUsd)}
        >
            <span className="text-sm leading-none">
                {isUsd ? (
                    <>
                        {amount?.toFixed(3)} {symbol}
                    </>
                ) : (
                    <>{amountUsd?.toFixed(3)} USD</>
                )}
            </span>

            <ArrowUpDown className="ml-1" size={16} />
        </button>
    );
};
