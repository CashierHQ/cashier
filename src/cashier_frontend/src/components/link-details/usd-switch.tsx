import { ArrowUpDown } from "lucide-react";
import { FC } from "react";
import { useTranslation } from "react-i18next";

type UsdSwitchProps = {
    amount?: number | null;
    symbol?: string;
    amountUsd?: number | null;
    isUsd: boolean;
    canConvert?: boolean;
    onToggle: (isUsd: boolean) => void;
};

export const UsdSwitch: FC<UsdSwitchProps> = ({
    isUsd,
    onToggle,
    amount,
    symbol,
    amountUsd,
    canConvert,
}) => {
    const { t } = useTranslation();

    const formatAmount = (value?: number, decimals: number = 3) => {
        if (value === undefined || isNaN(value)) return "0";
        return value.toFixed(decimals);
    };

    const getDisplayText = () => {
        if (isUsd) {
            return `${formatAmount(amount ?? 0)} ${symbol}`;
        }
        return `${formatAmount(amountUsd ?? 0)} USD`;
    };

    if (!canConvert) {
        return (
            <span className="text-xs text-grey/60 leading-none">
                {t("transaction.usd_conversion.no_price_available")}
            </span>
        );
    }

    return (
        <button
            type="button"
            className="flex items-center text-destructive"
            onClick={() => onToggle(!isUsd)}
            aria-label={isUsd ? "Switch to token amount" : "Switch to USD amount"}
        >
            <span className="text-xs text-grey/60 leading-none">{getDisplayText()}</span>
            <ArrowUpDown className="ml-1" size={16} />
        </button>
    );
};
