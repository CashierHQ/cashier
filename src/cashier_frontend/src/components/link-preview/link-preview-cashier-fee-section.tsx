// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

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
