import { ArrowUpDown, Info } from "lucide-react";
import { FC } from "react";
import { useTranslation } from "react-i18next";
import TransactionItem from "@/components/transaction-item";
import { mapIntentModelToAssetModel } from "@/services/types/mapper/intent.service.mapper";
import { IntentModel } from "@/services/types/refractor.intent.service.types";

type ConfirmationPopupAssetsSectionProps = {
    intents: IntentModel[];
};

export const ConfirmationPopupAssetsSection: FC<ConfirmationPopupAssetsSectionProps> = ({
    intents,
}) => {
    const { t } = useTranslation();

    return (
        <section id="confirmation-popup-section-send" className="my-3">
            <div className="flex justify-between">
                <div className="flex items-center">
                    <h2 className="font-medium ml-2">
                        {t("transaction.confirm_popup.send_label")}
                    </h2>

                    <Info className="text-destructive ml-1.5" size={16} />
                </div>

                <div className="flex text-destructive">
                    USD
                    <button onClick={() => console.log("info click")}>
                        <ArrowUpDown className="ml-1" size={16} />
                    </button>
                </div>
            </div>

            <div className="flex flex-col gap-3 border-solid border-inherit border-2 rounded-lg p-4 overflow-y-auto max-h-[200px]">
                {intents.map((intent) => (
                    <TransactionItem
                        key={`asset-${intent.id}`}
                        title={t("transaction.confirm_popup.asset_label")}
                        asset={mapIntentModelToAssetModel(intent)}
                    />
                ))}
            </div>
        </section>
    );
};
