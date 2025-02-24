import { ArrowUpDown } from "lucide-react";
import { FC } from "react";
import { useTranslation } from "react-i18next";

type UsdSwitchProps = {
    amount: number | undefined;
    symbol: string | undefined;
    amountUsd: number | undefined;
    isUsd: boolean;
    onToggle: (isUsd: boolean) => void;
};

export const UsdSwitch: FC<UsdSwitchProps> = ({ isUsd, onToggle, amount, symbol, amountUsd }) => {
    const { t } = useTranslation();
    const canConvert = amount !== undefined && amountUsd !== undefined;

    return (
        <>
            {canConvert ? (
                <button
                    type="button"
                    className="flex  items-center text-destructive"
                    onClick={() => onToggle(!isUsd)}
                >
                    <span className="text-sm leading-none">
                        {isUsd ? `${amount?.toFixed(3)} ${symbol}` : `${amountUsd?.toFixed(3)} USD`}
                    </span>

                    <ArrowUpDown className="ml-1" size={16} />
                </button>
            ) : (
                <span className="text-sm leading-none text-muted-foreground">
                    {t("transaction.usd_conversion.no_price_available")}
                </span>
            )}
        </>
    );
};
