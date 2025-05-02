import { FC, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { IntentModel } from "@/services/types/intent.service.types";
import { IntentHelperService } from "@/services/fee.service";
import { convert } from "@/utils/helpers/convert";
import { useIntentMetadata } from "@/hooks/useIntentMetadata";
import { TASK } from "@/services/types/enum";
import { Spinner } from "../ui/spinner";
import { useTokenStore } from "@/stores/tokenStore";
import { Label } from "../ui/label";
import { ICP_ADDRESS } from "@/const";
import { getTokenImage } from "@/utils";
import { ChevronRight } from "lucide-react";

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
    const { feeAmount } = useIntentMetadata(intents?.[0]);

    const { assetSymbol } = useIntentMetadata(intents?.[0]);
    const getTokenPrice = useTokenStore((state) => state.getTokenPrice);
    const isLoading = useTokenStore((state) => state.isLoading);

    const [totalCashierFee, setTotalCashierFee] = useState<number>();

    const tokenUsdPrice = getTokenPrice(ICP_ADDRESS);

    useEffect(() => {
        const initState = async () => {
            console.log("Intents: ", intents);
            //    const totalFees = intents.map((intent) => {
            //     return IntentHelperService.gete
            //    })
            const totalFeesMapArray = await IntentHelperService.getNetworkFeeMap(intents);
            console.log("Total fees mpa: ", totalFeesMapArray);
            const totalFees = totalFeesMapArray.reduce((acc, curr) => {
                return BigInt(acc) + BigInt(curr?.fee?.amount ?? 0n);
            }, BigInt(0));
            const totalFeesInUSD = convert(Number(totalFees) / 10 ** 8, tokenUsdPrice);
            setTotalCashierFee(Number(totalFeesInUSD));
        };

        initState();
    }, [intents]);

    return (
        <section id="confirmation-popup-section-total" className="mb-3">
            <div className="flex items-center w-full justify-between">
                <h2 className="font-medium text-[14px] ml-2">Total fees</h2>
            </div>
            <div className="flex flex-col gap-3 light-borders-green px-4 py-3">
                <div className="flex justify-between font-medium">
                    <img
                        src={getTokenImage(ICP_ADDRESS)}
                        alt="ICP"
                        className="w-7 h-7 rounded-full"
                    />

                    <div className="flex items-center">
                        {isLoading || !totalCashierFee ? (
                            <Spinner width={22} />
                        ) : (
                            <button className="flex items-center">
                                <p className="text-[14px] font-normal">
                                    ~${totalCashierFee.toFixed(4)}
                                </p>
                                <ChevronRight size={24} className="ml-1" />
                                {/* {tokenUsdPrice !== undefined &&
                                    `($${convert(calculateTotalCashierFee(), tokenUsdPrice)?.toFixed(3)}) ≈ `}
                                {calculateTotalCashierFee()} {assetSymbol} */}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </section>
    );
};
