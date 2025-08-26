// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

import { useTranslation } from "react-i18next";
import { Link } from "@/components/ui/link";

export function EmptyHistoryMessage() {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <p className="font-medium text-gray-600 mb-2">
        {t("history.list.noData")}
      </p>
      <div className="text-sm font-medium text-gray-500">
        <span>{t("history.list.cannotFind")}</span>{" "}
        <Link to="#" className="text-green hover:underline">
          {t("history.list.checkExplorer")}
        </Link>
      </div>
    </div>
  );
}
