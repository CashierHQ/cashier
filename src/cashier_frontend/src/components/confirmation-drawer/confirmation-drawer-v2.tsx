import { FC, useState } from "react";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { ConfirmationPopupAssetsSection } from "./confirmation-drawer-assets-section";
import { useConfirmButtonState, usePrimaryIntents } from "./confirmation-drawer.hooks";
import { ConfirmationPopupSkeleton } from "./confirmation-drawer-skeleton";
import { ACTION_STATE } from "@/services/types/enum";
import { ActionModel } from "@/services/types/action.service.types";
import { ConfirmationPopupLegalSection } from "./confirmation-drawer-legal-section";
import { useLinkAction } from "@/hooks/link-action-hooks";
import { ConfirmationPopupFeesSection } from "./confirmation-drawer-fees-section";

interface ConfirmationDrawerV2Props {
    open: boolean;
    onClose?: () => void;
    onInfoClick?: () => void;
    onCashierError?: (error: Error) => void;
    onActionResult?: (action: ActionModel) => void;
    onSuccessContinue?: () => Promise<void>;
    startTransaction: () => Promise<void>;
}

export const ConfirmationDrawerV2: FC<ConfirmationDrawerV2Props> = ({
    open,
    onClose = () => {},
    onInfoClick = () => {},
    onActionResult = () => {},
    onCashierError = () => {},
    onSuccessContinue = async () => {},
    startTransaction,
}) => {
    const { t } = useTranslation();
    const { action } = useLinkAction();

    const [isUsd, setIsUsd] = useState(false);

    const primaryIntents = usePrimaryIntents(action?.intents);

    const { isDisabled, setIsDisabled, buttonText, setButtonText } = useConfirmButtonState(
        action?.state,
        t,
    );

    const onClickSubmit = async () => {
        const isTxSuccess = action?.state === ACTION_STATE.SUCCESS;

        setIsDisabled(true);
        setButtonText(t("confirmation_drawer.processing"));

        if (isTxSuccess) {
            await onSuccessContinue();
        } else {
            await startTransaction();
        }
    };

    const title =
        action?.state === ACTION_STATE.SUCCESS
            ? t("confirmation_drawer.link_creation_success_title")
            : t("confirmation_drawer.title");

    const getContent = (action: ActionModel | undefined) => {
        if (action) {
            return (
                <>
                    <ConfirmationPopupAssetsSection
                        intents={primaryIntents}
                        onInfoClick={onInfoClick}
                        isUsd={isUsd}
                        onUsdClick={() => setIsUsd((old) => !old)}
                    />
                    <ConfirmationPopupFeesSection intents={primaryIntents} />

                    <ConfirmationPopupLegalSection />
                    <Button
                        className="my-3 mx-auto py-6 w-[95%] disabled:bg-disabledgreen"
                        disabled={isDisabled}
                        onClick={onClickSubmit}
                    >
                        {buttonText}
                    </Button>
                </>
            );
        } else {
            return (
                <>
                    <ConfirmationPopupSkeleton />
                </>
            );
        }
    };

    return (
        <Drawer
            open={open}
            onOpenChange={(isOpen) => {
                if (!isOpen) {
                    onClose();
                }
            }}
        >
            <DrawerContent className="max-w-[400px] mx-auto p-3 rounded-t-[1.5rem]">
                <DrawerHeader>
                    <DrawerTitle className="flex relative justify-center items-center">
                        <div className="text-center w-[100%] text-[18px] font-semibold">
                            {title}
                        </div>
                        <X
                            onClick={onClose}
                            strokeWidth={1.5}
                            className="ml-auto cursor-pointer absolute right-0"
                            size={28}
                        />
                    </DrawerTitle>
                </DrawerHeader>
                {getContent(action)}
            </DrawerContent>
        </Drawer>
    );
};
