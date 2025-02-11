import { TransactionModel } from "@/services/types/intent.service.types";
import { LinkModel } from "@/services/types/link.service.types";
import { ActionModel } from "@/services/types/action.service.types";
import { FC, useEffect, useState } from "react";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { useTranslation } from "react-i18next";
import { IoIosClose } from "react-icons/io";
import { Button } from "@/components/ui/button";
import { ConfirmationPopupAssetsSection } from "./confirmation-drawer-assets-section";
import { ConfirmationPopupFeesSection } from "./confirmation-drawer-fees-section";
import { ConfirmationPopupLegalSection } from "./confirmation-drawer-legal-section";
import {
    useCashierFeeIntents,
    useConfirmButtonState,
    usePrimaryIntents,
} from "./confirmation-drawer.hooks";
import { ConfirmationPopupSkeleton } from "./confirmation-drawer-skeleton";

export type ConfirmTransactionModel = {
    linkName?: string;
    linkData: LinkModel;
    action?: ActionModel;
    transactions?: TransactionModel[][];
};

interface ConfirmationDrawerProps {
    data: ConfirmTransactionModel | undefined;
    open: boolean;
    onClose: () => void;
    onConfirm: () => void;
    onInfoClick: () => void;
}

export const ConfirmationDrawer: FC<ConfirmationDrawerProps> = ({
    data,
    open,
    onClose,
    onConfirm,
    onInfoClick,
}) => {
    const { t } = useTranslation();
    const primaryIntents = usePrimaryIntents(data?.action?.intents);
    const cashierFeeIntents = useCashierFeeIntents(data?.action?.intents);
    const { disabled, text } = useConfirmButtonState(data?.action?.state);
    const [isDisabled, setIsDisabled] = useState(disabled);

    const onClickSubmit = () => {
        setIsDisabled(true);
        onConfirm();
    };

    useEffect(() => {
        setIsDisabled(disabled);
    }, [disabled]);

    return (
        <Drawer open={open}>
            <DrawerContent className="max-w-[400px] mx-auto p-3">
                <DrawerHeader>
                    <DrawerTitle className="flex justify-center items-center">
                        <div className="text-center w-[100%]">
                            {t("transaction.confirm_popup.title")}
                        </div>

                        <IoIosClose
                            onClick={onClose}
                            className="ml-auto cursor-pointer"
                            size={32}
                        />
                    </DrawerTitle>
                </DrawerHeader>
                {data ? (
                    <>
                        <ConfirmationPopupAssetsSection
                            intents={primaryIntents}
                            onInfoClick={onInfoClick}
                        />

                        <ConfirmationPopupFeesSection intents={cashierFeeIntents} />

                        <ConfirmationPopupLegalSection />

                        <Button disabled={isDisabled} onClick={onClickSubmit}>
                            {text}
                        </Button>
                    </>
                ) : (
                    <ConfirmationPopupSkeleton />
                )}
            </DrawerContent>
        </Drawer>
    );
};
