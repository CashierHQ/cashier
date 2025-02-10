import { IntentModel } from "@/services/types/intent.service.types";
import { FC } from "react";
import { useTranslation } from "react-i18next";
import { Info } from "lucide-react";
import { LinkPreviewCashierFeeItem } from "./link-preview-cashier-fee-item";
import { LinkPreviewCashierFeeTotal } from "./link-preview-cashier-fee-total";

type LinkPreviewCashierFeeSectionProps = {
    intents: IntentModel[];
    onInfoClick: () => void;
};

export const LinkPreviewCashierFeeSection: FC<LinkPreviewCashierFeeSectionProps> = ({
    intents,
    onInfoClick,
}) => {
    const { t } = useTranslation();

    return (
        <>
            <div className="flex justify-between items-center">
                <h2 className="font-medium ml-2">{t("link.preview.fees.label")}</h2>

                <Info className="text-green" size={16} onClick={onInfoClick} />
            </div>

            <ul className="flex flex-col gap-3 border-solid border-inherit border-2 rounded-lg mt-3 p-4 overflow-y-auto max-h-[200px]">
                {intents.map((intent) => (
                    <li key={intent.id}>
                        <LinkPreviewCashierFeeItem intent={intent} />
                    </li>
                ))}
            </ul>

            <LinkPreviewCashierFeeTotal intents={intents} />
        </>
    );
};
