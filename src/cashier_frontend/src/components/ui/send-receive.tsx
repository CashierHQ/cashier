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

import { ArrowUp, ArrowDown } from "lucide-react";
import { useTranslation } from "react-i18next";

interface SendReceiveProps {
    onSend?: () => void;
    onReceive?: () => void;
}

export function SendReceive({ onSend = () => {}, onReceive = () => {} }: SendReceiveProps) {
    const { t } = useTranslation();

    return (
        <div className="flex gap-6 mt-4">
            <button className="flex flex-col items-center w-14" onClick={onSend}>
                <div className="bg-lightgreen rounded-full p-2.5">
                    <ArrowUp size={18} />
                </div>

                <span className="text-xs text-lightgrey mt-1">{t("wallet.details.send")}</span>
            </button>

            <button className="flex flex-col items-center w-14" onClick={onReceive}>
                <div className="bg-lightgreen rounded-full p-2.5">
                    <ArrowDown size={18} />
                </div>

                <span className="text-xs text-lightgrey mt-1">{t("wallet.details.receive")}</span>
            </button>
        </div>
    );
}
