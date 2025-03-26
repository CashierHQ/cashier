import { FC, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { IntentModel } from "@/services/types/intent.service.types";
import { IntentHelperService } from "@/services/fee.service";
import { convert } from "@/utils/helpers/convert";
import { useConversionRatesQuery } from "@/hooks/useConversionRatesQuery";
import { useIntentMetadata } from "@/hooks/useIntentMetadata";
import { TASK } from "@/services/types/enum";
import { Spinner } from "../ui/spinner";

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
};

export const ConfirmationPopupFeesSection: FC<ConfirmationPopupFeesSectionProps> = ({
    intents,
}) => {
    const { t } = useTranslation();
    const { assetSymbol } = useIntentMetadata(intents?.[0]);
    const { data: conversionRates, isLoading: isLoadingConversionRates } = useConversionRatesQuery(
        intents[0]?.asset.address,
    );
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
                <div className="flex justify-between font-medium">
                    <div>{t(getItemLabel(intents[0]))}</div>

                    <div className="flex items-center">
                        {isLoadingConversionRates || !totalCashierFee ? (
                            <Spinner width={22} />
                        ) : (
                            <>
                                {conversionRates?.tokenToUsd !== undefined &&
                                    `($${convert(totalCashierFee, conversionRates?.tokenToUsd)?.toFixed(3)}) ≈ `}
                                {totalCashierFee} {assetSymbol}
                            </>
                        )}
                    </div>
                </div>
            </div>
        </section>
    );
};
