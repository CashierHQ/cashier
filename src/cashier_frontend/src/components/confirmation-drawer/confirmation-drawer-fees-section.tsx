import { FC, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { IntentModel } from "@/services/types/intent.service.types";
import { IntentHelperService } from "@/services/fee.service";
import { convert } from "@/utils/helpers/convert";
import { useConversionRatesQuery } from "@/hooks/useConversionRatesQuery";
import { useIntentMetadata } from "@/hooks/useIntentMetadata";

type ConfirmationPopupFeesSectionProps = {
    intents: IntentModel[];
    isUsd?: boolean;
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
                    <h4>{t("transaction.confirm_popup.total_cashier_fees_label")}</h4>

                    <div className="flex items-center">
                        {isUsd &&
                            !isLoadingConversionRates &&
                            conversionRates!.tokenToUsd !== undefined &&
                            `($${convert(totalCashierFee, conversionRates!.tokenToUsd)?.toFixed(3)}) ≈ `}{" "}
                        {totalCashierFee} {assetSymbol}
                    </div>
                </div>
            </div>
        </section>
    );
};
