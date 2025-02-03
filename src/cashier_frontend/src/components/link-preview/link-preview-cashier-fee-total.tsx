import { NETWORK_FEE_DEFAULT_SYMBOL } from "@/constants/defaultValues";
import { useIntentsTotal } from "@/hooks/useIntentsTotal";
import { IntentModel } from "@/services/types/refractor.intent.service.types";
import { FC } from "react";
import { useTranslation } from "react-i18next";

type LinkPreviewCashierFeeTotalProps = {
    intents: IntentModel[];
};

export const LinkPreviewCashierFeeTotal: FC<LinkPreviewCashierFeeTotalProps> = ({ intents }) => {
    const { t } = useTranslation();
    const totalCashierFee = useIntentsTotal(intents);

    return (
        <div className="mt-2 flex flex-col gap-3 rounded-lg p-4 bg-lightgreen">
            <div className="flex justify-between items-center">
                <h5>{t("link.preview.fees.totalFee")}</h5>

                <div className="flex items-center">
                    <span>{totalCashierFee}</span>
                    <span className="ml-1">{NETWORK_FEE_DEFAULT_SYMBOL}</span>
                </div>
            </div>
        </div>
    );
};
