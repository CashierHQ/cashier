import { FC } from "react";
import { useTranslation } from "react-i18next";
import { Info } from "lucide-react";
import { LinkPreviewCashierFeeItem } from "./link-preview-cashier-fee-item";
import { LinkPreviewCashierFeeTotal } from "./link-preview-cashier-fee-total";
import { FeeModel } from "@/services/types/intent.service.types";

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
        <div className="my-5">
            <div className="flex justify-between items-center">
                <h2 className="text-sm font-medium leading-6 text-gray-900 ml-2">
                    {t("link.preview.fees.label")}
                </h2>
                <Info className="text-green" size={22} onClick={onInfoClick} />
            </div>

            <ul className="flex flex-col gap-3 border-solid border-inherit border-2 rounded-xl mt-3 p-4 overflow-y-auto max-h-[200px]">
                {intents.map((intent, index) => (
                    <li key={`fee-${index}`}>
                        <LinkPreviewCashierFeeItem feeModel={intent} />
                    </li>
                ))}
            </ul>

            <LinkPreviewCashierFeeTotal intents={intents} />
        </div>
    );
};
