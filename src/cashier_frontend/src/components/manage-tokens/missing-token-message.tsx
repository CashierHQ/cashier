// Cashier — No-code blockchain transaction builder
// Copyright (C) 2025 TheCashierApp LLC
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with this program.  If not, see <https://www.gnu.org/licenses/>.

import { Search } from "lucide-react";
import { useTranslation } from "react-i18next";

export function ManageTokensMissingTokenMessage() {
    const { t } = useTranslation();

    return (
        <div className="flex flex-col items-center justify-center mt-16">
            <div className="w-12 h-12 rounded-xl bg-lightgreen flex items-center justify-center mb-4">
                <Search className="stroke-green" size={24} />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">{t("manage.missing")}</h3>
            <p className="text-sm text-gray-500 text-center max-w-[250px] mb-4">
                {t("wallet.noToken")}
            </p>
        </div>
    );
}
