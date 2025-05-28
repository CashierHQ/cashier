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

import { FC } from "react";
import { useTranslation } from "react-i18next";
import { Info } from "lucide-react";
import { LinkPreviewCashierFeeItem } from "./link-preview-cashier-fee-item";
import { LinkPreviewCashierFeeTotal } from "./link-preview-cashier-fee-total";
import { FeeModel } from "@/services/types/intent.service.types";
import { Label } from "../ui/label";

type LinkPreviewCashierFeeSectionProps = {
    intents: FeeModel[];
    onInfoClick: () => void;
};

export const LinkPreviewCashierFeeSection: FC<LinkPreviewCashierFeeSectionProps> = ({
    intents,
    onInfoClick,
}) => {
    const { t } = useTranslation();
    if (intents.length === 0) {
        return null;
    }
    return (
        <div className="">
            <div className="flex justify-between items-center">
                <div className="flex justify-between items-center mb-2">
                    <Label>{t("link.preview.fees.label")}</Label>
                </div>
                <Info className="text-green" size={20} onClick={onInfoClick} />
            </div>

            <ul className="flex flex-col gap-3 border-solid border-inherit border-[1px] rounded-xl mt-3 px-4 py-[0.4rem] overflow-y-auto max-h-[200px]">
                {intents.map((intent, index) => (
                    <li key={`fee-${index}`}>
                        <LinkPreviewCashierFeeItem feeModel={intent} />
                    </li>
                ))}
            </ul>

            <div className="text-sm">
                <LinkPreviewCashierFeeTotal intents={intents} />
            </div>
        </div>
    );
};
