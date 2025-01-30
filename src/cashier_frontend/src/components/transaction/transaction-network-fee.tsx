import { NETWORK_FEE_DEFAULT_SYMBOL } from "@/constants/defaultValues";
import { FC } from "react";
import { useTranslation } from "react-i18next";

type TransactionNetworkFeeProps = {
    isLoading?: boolean;
    displayAmount: number | undefined;
};

export const TransactionNetworkFee: FC<TransactionNetworkFeeProps> = ({
    isLoading,
    displayAmount,
}) => {
    const { t } = useTranslation();

    return (
        <div className="flex justify-between text-xs leading-tight">
            <h6 id="transaction-title" className="ml-1.5 text-right">
                {t("transaction.confirm_popup.network_fee_label")}
            </h6>

            <div className="flex">
                {isLoading ? (
                    <img src="/loading.gif" width={22} />
                ) : (
                    <div className="flex">
                        + {displayAmount} {NETWORK_FEE_DEFAULT_SYMBOL}
                    </div>
                )}
            </div>
        </div>
    );
};
