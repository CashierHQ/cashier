import { ArrowUpDown, Info } from "lucide-react";
import { FC } from "react";
import { useTranslation } from "react-i18next";
import { TransactionItem } from "@/components/transaction/transaction-item";
import { IntentModel } from "@/services/types/intent.service.types";
import { TASK } from "@/services/types/enum";

type ConfirmationPopupAssetsSectionProps = {
    intents: IntentModel[];
    onInfoClick?: () => void;
    isUsd?: boolean;
    onUsdClick?: () => void;
};

const getLabel = (intent: IntentModel) => {
    switch (intent.task) {
        case TASK.TRANSFER_WALLET_TO_LINK:
        case TASK.TRANSFER_WALLET_TO_TREASURY:
            return "transaction.confirm_popup.send_label";
        case TASK.TRANSFER_LINK_TO_WALLET:
            return "transaction.confirm_popup.receive_label";
        default:
            return "transaction.confirm_popup.send_label";
    }
};

export const ConfirmationPopupAssetsSection: FC<ConfirmationPopupAssetsSectionProps> = ({
    intents,
    onInfoClick,
    isUsd,
    onUsdClick,
}) => {
    const { t } = useTranslation();

    return (
        <section id="confirmation-popup-section-send" className="my-3">
            <div className="flex justify-between">
                <div className="flex items-center">
                    <h2 className="font-medium ml-2">{t(getLabel(intents[0]))}</h2>

                    <Info className="text-destructive ml-1.5" size={22} onClick={onInfoClick} />
                </div>

                <button className="flex text-destructive items-center" onClick={onUsdClick}>
                    USD
                    <ArrowUpDown className="ml-1" size={16} />
                </button>
            </div>

            <ol className="flex flex-col gap-3 border-solid border-inherit border-[1px] rounded-xl mt-1 p-4 overflow-y-auto max-h-[200px]">
                {intents.map((intent) => (
                    <li key={intent.id}>
                        <TransactionItem
                            title={t("transaction.confirm_popup.asset_label")}
                            intent={intent}
                            isUsd={isUsd}
                        />
                    </li>
                ))}
            </ol>
        </section>
    );
};
