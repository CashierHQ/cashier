// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

import { useTranslation } from "react-i18next";
import { Link } from "@/components/ui/link";

export function EmptyHistoryMessage() {
    const { t } = useTranslation();

    return (
        <>
            <p className="font-medium mt-9">{t("history.list.noData")}</p>
            <div className="text-sm font-medium">
                <span>{t("history.list.cannotFind")}</span>{" "}
                <Link to="#">{t("history.list.checkExplorer")}</Link>
            </div>
        </>
    );
}
