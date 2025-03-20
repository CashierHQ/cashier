import { FC, useState } from "react";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { useTranslation } from "react-i18next";
import { IoIosClose } from "react-icons/io";
import { Button } from "@/components/ui/button";
import { ConfirmationPopupAssetsSection } from "./confirmation-drawer-assets-section";
import { ConfirmationPopupFeesSection } from "./confirmation-drawer-fees-section";
import {
    useCashierFeeIntents,
    useConfirmButtonState,
    usePrimaryIntents,
} from "./confirmation-drawer.hooks";
import { ConfirmationPopupSkeleton } from "./confirmation-drawer-skeleton";
import { useCreateLinkStore } from "@/stores/createLinkStore";
import { ACTION_STATE, ACTION_TYPE } from "@/services/types/enum";
import { useIcrc112Execute, useProcessAction, useUpdateAction } from "@/hooks/linkHooks";
import { ActionModel } from "@/services/types/action.service.types";
import { ConfirmationPopupLegalSection } from "./confirmation-drawer-legal-section";
import { isCashierError } from "@/services/errorProcess.service";

interface ConfirmationDrawerProps {
    open: boolean;
    onClose?: () => void;
    onInfoClick?: () => void;
    onCashierError?: (error: Error) => void;
    onActionResult?: (action: ActionModel) => void;
    onSuccessContinue?: () => Promise<void>;
}

export const ConfirmationDrawer: FC<ConfirmationDrawerProps> = ({
    open,
    onClose = () => {},
    onInfoClick = () => {},
    onActionResult = () => {},
    onCashierError = () => {},
    onSuccessContinue = async () => {},
}) => {
    const { t } = useTranslation();
    const { link, action, setAction } = useCreateLinkStore();

    const [isUsd, setIsUsd] = useState(false);

    const { mutateAsync: processAction } = useProcessAction();
    const { mutateAsync: updateAction } = useUpdateAction();
    const { mutateAsync: icrc112Execute } = useIcrc112Execute();

    const primaryIntents = usePrimaryIntents(action?.intents);
    const cashierFeeIntents = useCashierFeeIntents(action?.intents);

    const { isDisabled, setIsDisabled, buttonText, setButtonText } = useConfirmButtonState(
        action?.state,
        t,
    );

    const startTransaction = async () => {
        try {
            const firstUpdatedAction = await processAction({
                linkId: link!.id,
                actionType: ACTION_TYPE.CREATE_LINK,
                actionId: action!.id,
            });
            setAction(firstUpdatedAction);
            if (firstUpdatedAction) {
                console.log("🚀 ~ startTransaction ~ firstUpdatedAction:", firstUpdatedAction);
                const response = await icrc112Execute({
                    transactions: firstUpdatedAction!.icrc112Requests,
                    linkTitle: link?.title || "",
                });
                console.log("🚀 ~ icrc112Execute ~ response:", response);
                if (response) {
                    const secondUpdatedAction = await updateAction({
                        actionId: action!.id,
                        linkId: link!.id,
                        external: true,
                    });
                    console.log("🚀 ~ secondUpdatedAction ~ response:", secondUpdatedAction);

                    if (secondUpdatedAction) {
                        setAction(secondUpdatedAction);
                        onActionResult(secondUpdatedAction);
                    }
                }
            }
        } catch (error) {
            console.log("🚀 ~ startTransaction ~ error:", error);
            if (isCashierError(error)) {
                onCashierError(error);
            } else {
                console.error(error);
            }
            setIsDisabled(false);
            setButtonText(t("transaction.confirm_popup.confirm_button"));
            throw error;
        }
    };

    const onClickSubmit = async () => {
        const isTxSuccess = action?.state === ACTION_STATE.SUCCESS;

        setIsDisabled(true);
        setButtonText(t("transaction.confirm_popup.processing"));

        if (isTxSuccess) {
            await onSuccessContinue();
        } else {
            await startTransaction();
        }
    };

    return (
        <Drawer open={open}>
            <DrawerContent className="max-w-[400px] mx-auto p-3 rounded-t-[1.5rem]">
                <DrawerHeader>
                    <DrawerTitle className="relative flex items-center justify-center">
                        <div className="text-center text-xl">
                            {t("transaction.confirm_popup.title")}
                        </div>

                        <IoIosClose
                            onClick={onClose}
                            className="absolute right-0 cursor-pointer"
                            size={42}
                        />
                    </DrawerTitle>
                </DrawerHeader>

                {action ? (
                    <>
                        <ConfirmationPopupAssetsSection
                            intents={primaryIntents}
                            onInfoClick={onInfoClick}
                            isUsd={isUsd}
                            onUsdClick={() => setIsUsd((old) => !old)}
                        />

                        {cashierFeeIntents && cashierFeeIntents.length > 0 && (
                            <ConfirmationPopupFeesSection
                                intents={cashierFeeIntents}
                                isUsd={isUsd}
                            />
                        )}
                        <ConfirmationPopupLegalSection />
                        <Button
                            className="my-3 mx-auto py-6 w-[95%]"
                            disabled={isDisabled}
                            onClick={onClickSubmit}
                        >
                            {buttonText}
                        </Button>
                    </>
                ) : (
                    <ConfirmationPopupSkeleton />
                )}
            </DrawerContent>
        </Drawer>
    );
};
