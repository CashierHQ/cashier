import { ArrowUpDown, Info } from "lucide-react";
import { FC } from "react";
import { useTranslation } from "react-i18next";
import { TransactionItem } from "@/components/transaction/transaction-item";
import { IntentModel } from "@/services/types/intent.service.types";
import { TASK } from "@/services/types/enum";
import { transformShortAddress } from "@/utils";
import { AssetAvatar } from "@/components/ui/asset-avatar";
import { useIntentMetadata } from "@/hooks/useIntentMetadata";
import { Spinner } from "@/components/ui/spinner";

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

export const SendAssetConfirmationPopupAssetsSection: FC<ConfirmationPopupAssetsSectionProps> = ({
    intents,
}) => {
    const { t } = useTranslation();

    const { isLoadingMetadata, assetSymbol, assetSrc, feeAmount, feeSymbol } = useIntentMetadata(
        intents[0],
    );

    return (
        <section id="confirmation-popup-section-send" className="my-3">
            <div className="flex flex-col gap-3 border-solid border-inherit border-[1px] rounded-xl mt-1 p-4 overflow-y-auto max-h-[200px]">
                <div className="flex justify-between items-center">
                    <span>To</span>
                    <span>{transformShortAddress(intents[0].to.address)}</span>
                </div>

                <div className="h-[1px] w-full bg-gray-200"></div>

                <div className="flex justify-between items-center">
                    <span>Network</span>
                    <div className="flex items-center">
                        <span>{intents[0].asset.chain}</span>
                        <AssetAvatar className="ml-1 w-5 h-5" src={"./icpLogo.png"} symbol="ICP" />
                    </div>
                </div>

                <div className="flex justify-between items-center">
                    <span>Network fee</span>
                    {isLoadingMetadata ? (
                        <Spinner className="m-4 h-4" />
                    ) : (
                        <div className="flex items-center">
                            <span>
                                {feeAmount} {feeSymbol}
                            </span>
                            <AssetAvatar
                                className="ml-1 w-5 h-5"
                                src={assetSrc}
                                symbol={assetSymbol}
                            />
                        </div>
                    )}
                </div>
            </div>
        </section>
    );
};
