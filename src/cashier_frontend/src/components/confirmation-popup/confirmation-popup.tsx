import React, { useMemo, useEffect, useState } from "react";
import { DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { IoIosClose } from "react-icons/io";
import { useTranslation } from "react-i18next";
import { TransactionModel } from "@/services/types/intent.service.types";
import { TASK } from "@/services/types/enum";
import { IntentHelperService } from "@/services/fee.service";
import { ActionModel } from "@/services/types/refractor.action.service.types";
import { LinkModel } from "@/services/types/link.service.types";
import { ConfirmationPopupSkeleton } from "@/components/confirmation-popup/confirmation-popup-skeleton";
import { ConfirmationPopupAssetsSection } from "@/components/confirmation-popup/confirmation-popup-assets-section";
import { ConfirmationPopupFeesSection } from "@/components/confirmation-popup/confirmation-popup-fees-section";
import { ConfirmationPopupLegalSection } from "@/components/confirmation-popup/confirmation-popup-legal-section";
import { ConfirmationPopupYouWillRecieveSection } from "./confirmation-popup-you-will-resieve-section";

export type ConfirmTransactionModel = {
    linkName?: string;
    linkData: LinkModel;
    action: ActionModel;
    transactions?: TransactionModel[][];
};

interface ConfirmationPopupProps {
    data: ConfirmTransactionModel | undefined;
    handleClose: () => void;
    handleConfirm: () => void;
    disabled: boolean;
    buttonText: string;
}

const ConfirmationPopup: React.FC<ConfirmationPopupProps> = ({
    data,
    handleClose,
    handleConfirm,
    disabled,
    buttonText,
}) => {
    const { t: translate } = useTranslation();
    const [isLoading, setLoading] = useState<boolean>(true);

    const primaryIntents =
        useMemo(() => {
            return (
                data?.action.intents.filter(
                    (intent) => intent.task === TASK.TRANSFER_WALLET_TO_LINK,
                ) ?? []
            );
        }, [data?.action.intents]) ?? [];

    const cashierFeeIntents = useMemo(() => {
        return (
            data?.action.intents.filter(
                (intent) => intent.task === TASK.TRANSFER_WALLET_TO_TREASURY,
            ) ?? []
        );
    }, [data?.action.intents]);

    // useEffect(() => {
    //     const initState = async () => {
    //         const totalCashierFee = await IntentHelperService.calculateTotal(cashierTransferAssets);
    //         setTotalCashierFee(totalCashierFee);
    //         setLoading(false);
    //     };

    //     initState();
    // }, []);

    return (
        <DrawerContent className="max-w-[400px] mx-auto p-3">
            <DrawerHeader>
                <DrawerTitle className="flex justify-center">
                    <div className="text-center w-[100%]">
                        {translate("transaction.confirm_popup.title")}
                    </div>
                    <IoIosClose
                        onClick={handleClose}
                        className="ml-auto cursor-pointer"
                        size={32}
                    />
                </DrawerTitle>
            </DrawerHeader>

            {isLoading ? (
                <ConfirmationPopupSkeleton />
            ) : (
                <>
                    <ConfirmationPopupYouWillRecieveSection linkName={data?.linkName} />

                    <ConfirmationPopupAssetsSection intents={primaryIntents} />

                    <ConfirmationPopupFeesSection intents={cashierFeeIntents} />

                    <ConfirmationPopupLegalSection />

                    <Button disabled={disabled} onClick={handleConfirm}>
                        {buttonText}
                    </Button>
                </>
            )}
        </DrawerContent>
    );
};

export default ConfirmationPopup;
