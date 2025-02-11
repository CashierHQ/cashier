import { TransactionModel } from "@/services/types/intent.service.types";
import { LinkModel } from "@/services/types/link.service.types";
import { FC, useState } from "react";
import { ActionModel } from "@/services/types/action.service.types";
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
    const { disabled, text } = useConfirmButtonState(data?.linkData.intent_create?.state);
    const [isUsd, setIsUsd] = useState(false);

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

                <ConfirmationPopupAssetsSection
                    intents={primaryIntents}
                    onInfoClick={onInfoClick}
                    isUsd={isUsd}
                    onUsdClick={() => setIsUsd((old) => !old)}
                />

                <ConfirmationPopupFeesSection intents={cashierFeeIntents} isUsd={isUsd} />

                <ConfirmationPopupLegalSection />

                <Button disabled={disabled} onClick={onConfirm}>
                    {text}
                </Button>
            </DrawerContent>
        </Drawer>
    );
};
