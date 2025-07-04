// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

import { useTranslation } from "react-i18next";

export function UsdConversionUnavailable() {
    const { t } = useTranslation();

    return (
        <span className="text-sm leading-none text-muted-foreground">
            {t("transaction.usd_conversion.no_price_available")}
        </span>
    );
}
