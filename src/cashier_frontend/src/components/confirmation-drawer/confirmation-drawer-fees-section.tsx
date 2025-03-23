import { FC, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { IntentModel } from "@/services/types/intent.service.types";
import { IntentHelperService } from "@/services/fee.service";
import { convert } from "@/utils/helpers/convert";
import { useConversionRatesQuery } from "@/hooks/useConversionRatesQuery";
import { useIntentMetadata } from "@/hooks/useIntentMetadata";
import { TASK } from "@/services/types/enum";

type ConfirmationPopupFeesSectionProps = {
    intents: IntentModel[];
    isUsd?: boolean;
};

const getItemLabel = (intent: IntentModel) => {
    switch (intent.task) {
        case TASK.TRANSFER_LINK_TO_WALLET:
            return "transaction.confirm_popup.total_assets_received_label";
        case TASK.TRANSFER_WALLET_TO_LINK:
        case TASK.TRANSFER_WALLET_TO_TREASURY:
        default:
            return "transaction.confirm_popup.total_cashier_fees_label";
    }
    return intent.task;
};

export const ConfirmationPopupFeesSection: FC<ConfirmationPopupFeesSectionProps> = ({
    intents,
    isUsd,
}) => {
    const { t } = useTranslation();
    const { assetSymbol } = useIntentMetadata(intents?.[0]);
    const { data: conversionRates, isLoading: isLoadingConversionRates } = useConversionRatesQuery(
        intents[0]?.asset.address,
    );
    console.log("🚀 ~ conversionRates:", conversionRates);
    const [totalCashierFee, setTotalCashierFee] = useState<number>();

    useEffect(() => {
        const initState = async () => {
            const totalCashierFee = await IntentHelperService.calculateTotal(intents);
            setTotalCashierFee(totalCashierFee);
        };

        initState();
    }, []);

    return (
        <section id="confirmation-popup-section-total" className="mb-3">
            <div className="flex flex-col gap-3 rounded-xl p-4 bg-lightgreen">
                <div className="flex justify-between text-lg">
                    <h4>{t(getItemLabel(intents[0]))}</h4>

                    <div className="flex items-center">
                        {!isLoadingConversionRates &&
                            conversionRates?.tokenToUsd !== undefined &&
                            `($${convert(totalCashierFee, conversionRates?.tokenToUsd)?.toFixed(3)}) ≈ `}{" "}
                        {totalCashierFee} {assetSymbol}
                    </div>
                </div>
            </div>
        </section>
    );
};
