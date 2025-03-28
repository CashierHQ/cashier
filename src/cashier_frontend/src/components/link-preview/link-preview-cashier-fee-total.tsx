import { NETWORK_FEE_DEFAULT_SYMBOL } from "@/constants/defaultValues";
import { useConversionRatesQuery } from "@/hooks/useConversionRatesQuery";
import { useFeeTotal } from "@/hooks/useFeeMetadata";
import { FeeModel } from "@/services/types/intent.service.types";
import { convert } from "@/utils/helpers/convert";
import { useTranslation } from "react-i18next";
import { Spinner } from "../ui/spinner";
import { FC } from "react";
import { ConversionRates } from "@/services/types/usdConversion.service.types";

type LinkPreviewCashierFeeTotalProps = {
    intents: FeeModel[];
};

const FeeDisplay: FC<{
    totalCashierFee: number | undefined;
    conversionRates: ConversionRates | undefined;
    isLoading: boolean;
}> = ({ totalCashierFee, conversionRates, isLoading }) => {
    if (
        (conversionRates === undefined || conversionRates.tokenToUsd === undefined) &&
        totalCashierFee !== undefined
    ) {
        return (
            <>
                <span>{totalCashierFee}</span>
                <span className="ml-1">{NETWORK_FEE_DEFAULT_SYMBOL}</span>
            </>
        );
    }

    if (
        totalCashierFee === undefined ||
        isLoading ||
        convert(totalCashierFee, conversionRates?.tokenToUsd)?.toFixed(3) === undefined
    ) {
        return <Spinner width={22} />;
    }

    return (
        <span>
            {!isLoading &&
                conversionRates?.tokenToUsd !== undefined &&
                `($${convert(totalCashierFee, conversionRates.tokenToUsd)?.toFixed(3)}) ≈ `}{" "}
            {totalCashierFee} {NETWORK_FEE_DEFAULT_SYMBOL}
        </span>
    );
};

export const LinkPreviewCashierFeeTotal: FC<LinkPreviewCashierFeeTotalProps> = ({ intents }) => {
    const { t } = useTranslation();
    const totalCashierFee = useFeeTotal(intents);
    const { data: conversionRates, isLoading: isLoadingConversionRates } = useConversionRatesQuery(
        intents[0].address,
    );

    return (
        <div className="mt-2 flex flex-col gap-3 rounded-xl p-4 bg-lightgreen">
            <div className="flex justify-between items-center font-medium">
                <h6 className="text-sm">{t("link.preview.fees.totalFee")}</h6>
                <div className="flex items-center">
                    <FeeDisplay
                        totalCashierFee={totalCashierFee}
                        conversionRates={conversionRates}
                        isLoading={isLoadingConversionRates}
                    />
                </div>
            </div>
        </div>
    );
};
