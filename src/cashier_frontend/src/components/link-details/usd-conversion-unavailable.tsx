import { useTranslation } from "react-i18next";

export function UsdConversionUnavailable() {
    const { t } = useTranslation();

    return (
        <span className="text-sm leading-none text-muted-foreground">
            {t("transaction.usd_conversion.no_price_available")}
        </span>
    );
}
