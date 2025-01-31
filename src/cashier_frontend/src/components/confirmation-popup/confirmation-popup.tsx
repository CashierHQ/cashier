import React, { useEffect, useMemo, useState } from "react";
import { DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { IoIosClose } from "react-icons/io";
import { ChevronLeftIcon } from "@radix-ui/react-icons";
import { useTranslation } from "react-i18next";
import { TransactionModel } from "@/services/types/intent.service.types";
import { ActionModel } from "@/services/types/refractor.action.service.types";
import { LinkModel } from "@/services/types/link.service.types";
import { ConfirmationPopupSkeleton } from "@/components/confirmation-popup/confirmation-popup-skeleton";
import { ConfirmationPopupAssetsSection } from "@/components/confirmation-popup/confirmation-popup-assets-section";
import { ConfirmationPopupFeesSection } from "@/components/confirmation-popup/confirmation-popup-fees-section";
import { ConfirmationPopupLegalSection } from "@/components/confirmation-popup/confirmation-popup-legal-section";
import { TASK } from "@/services/types/enum";
import { Link, Wifi } from "lucide-react";

export type ConfirmTransactionModel = {
    linkName?: string;
    linkData: LinkModel;
    action?: ActionModel;
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
    const { t } = useTranslation();
    const [isLoading, setLoading] = useState<boolean>(true);
    const [isInfo, setIsInfo] = useState<boolean>(true);

    const primaryIntents =
        useMemo(() => {
            return (
                data?.action?.intents.filter(
                    (intent) => intent.task === TASK.TRANSFER_WALLET_TO_LINK,
                ) ?? []
            );
        }, [data?.action?.intents]) ?? [];

    const cashierFeeIntents = useMemo(() => {
        return (
            data?.action?.intents.filter(
                (intent) => intent.task === TASK.TRANSFER_WALLET_TO_TREASURY,
            ) ?? []
        );
    }, [data?.action?.intents]);

    useEffect(() => {
        const initState = async () => {
            //const totalCashierFee = await IntentHelperService.calculateTotal(cashierTransferAssets);
            //setTotalCashierFee(totalCashierFee);
            setLoading(false);
        };

        initState();
    }, []);

    const renderDrawerContent = () => {
        if (isLoading) {
            return (
                <>
                    <DrawerHeader>
                        <DrawerTitle className="flex justify-center">
                            <div className="text-center w-[100%]">
                                {t("transaction.confirm_popup.title")}
                            </div>
                            <IoIosClose
                                onClick={handleClose}
                                className="ml-auto cursor-pointer"
                                size={32}
                            />
                        </DrawerTitle>
                    </DrawerHeader>

                    <ConfirmationPopupSkeleton />
                </>
            );
        }

        if (isInfo) {
            return (
                <>
                    <DrawerHeader>
                        <DrawerTitle className="flex justify-center items-center">
                            <ChevronLeftIcon
                                onClick={() => setIsInfo(false)}
                                className="ml-auto cursor-pointer w-[32px] h-[32px]"
                            />

                            <div className="text-center w-[100%]">
                                {t("transaction.confirm_popup.info.title")}
                            </div>
                            <IoIosClose
                                onClick={handleClose}
                                className="ml-auto cursor-pointer"
                                size={32}
                            />
                        </DrawerTitle>
                    </DrawerHeader>

                    <div className="px-4 pb-4 mt-2">
                        <h4 className="font-bold mt-5 flex flex-row">
                            <Link className="text-green mr-1" />
                            {t("transaction.confirm_popup.info.cashier_fee_header")}
                        </h4>
                        <p className="mt-0.5">
                            {t("transaction.confirm_popup.info.cashier_fee_text")}
                        </p>

                        <h4 className="font-bold mt-5 flex flex-row">
                            <Wifi className="text-green mr-1" />
                            {t("transaction.confirm_popup.info.network_fee_header")}
                        </h4>
                        <div className="flex flex-col gap-2 mt-0.5">
                            {(
                                t("transaction.confirm_popup.info.network_fee_text", {
                                    returnObjects: true,
                                }) as string[]
                            ).map((paragraph, index) => (
                                <p key={index}>{paragraph}</p>
                            ))}
                        </div>
                    </div>

                    <Button disabled={disabled} onClick={handleConfirm} className="mt-6">
                        {t("transaction.confirm_popup.info.button_text")}
                    </Button>
                </>
            );
        }

        return (
            <>
                <DrawerHeader>
                    <DrawerTitle className="flex justify-center items-center">
                        <div className="text-center w-[100%]">
                            {t("transaction.confirm_popup.title")}
                        </div>
                        <IoIosClose
                            onClick={handleClose}
                            className="ml-auto cursor-pointer"
                            size={32}
                        />
                    </DrawerTitle>
                </DrawerHeader>

                <ConfirmationPopupAssetsSection
                    intents={primaryIntents}
                    onInfoClick={() => setIsInfo(true)}
                />

                <ConfirmationPopupFeesSection intents={cashierFeeIntents} />

                <ConfirmationPopupLegalSection />

                <Button disabled={disabled} onClick={handleConfirm}>
                    {buttonText}
                </Button>
            </>
        );
    };

    return (
        <DrawerContent className="max-w-[400px] mx-auto p-3">{renderDrawerContent()}</DrawerContent>
    );
};

export default ConfirmationPopup;
