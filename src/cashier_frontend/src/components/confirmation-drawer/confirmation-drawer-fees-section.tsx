import { FC, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { TransactionItem } from "@/components/transaction/transaction-item";
import { IntentModel } from "@/services/types/refractor.intent.service.types";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { IntentHelperService } from "@/services/fee.service";
import { IC_EXPLORER_IMAGES_PATH } from "@/services/icExplorer.service";
import { NETWORK_FEE_DEFAULT_SYMBOL } from "@/constants/defaultValues";

type ConfirmationPopupFeesSectionProps = {
    intents: IntentModel[];
};

export const ConfirmationPopupFeesSection: FC<ConfirmationPopupFeesSectionProps> = ({
    intents,
}) => {
    const { t } = useTranslation();
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
            <div className="flex flex-col gap-3 rounded-lg p-4 bg-lightgreen">
                {intents.map((intent) => {
                    return (
                        <TransactionItem
                            key={intent.id}
                            title={t("transaction.confirm_popup.link_creation_fee_label")}
                            intent={intent}
                        />
                    );
                })}

                <hr className="border border-white" />

                <div className="flex justify-between text-lg">
                    <h4>{t("transaction.confirm_popup.total_cashier_fees_label")}</h4>

                    <div className="flex items-center">
                        {totalCashierFee} {NETWORK_FEE_DEFAULT_SYMBOL}
                        <Avatar className="w-7 h-7 ml-3">
                            <AvatarImage
                                src={`${IC_EXPLORER_IMAGES_PATH}${intents[0]?.asset.address}`}
                            />
                            <AvatarFallback>ICP</AvatarFallback>
                        </Avatar>
                    </div>
                </div>
            </div>
        </section>
    );
};
