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
import { ACTION_STATE, ACTION_TYPE, INTENT_STATE } from "@/services/types/enum";
import { useNavigate } from "react-router-dom";
import {
    useIcrc112Execute,
    useProcessAction,
    useSetLinkActive,
    useUpdateAction,
} from "@/hooks/linkHooks";
import { ActionModel } from "@/services/types/action.service.types";
import { ConfirmationPopupLegalSection } from "./confirmation-drawer-legal-section";

interface ConfirmationDrawerProps {
    open: boolean;
    onClose?: () => void;
    onInfoClick?: () => void;
    onActionResult?: (action: ActionModel) => void;
}

export const ConfirmationDrawer: FC<ConfirmationDrawerProps> = ({
    open,
    onClose = () => {},
    onInfoClick = () => {},
    onActionResult = () => {},
}) => {
    const navigate = useNavigate();

    const { t } = useTranslation();
    const { link, setLink, action, setAction } = useCreateLinkStore();

    const [isUsd, setIsUsd] = useState(false);

    const { mutateAsync: setLinkActive } = useSetLinkActive();
    const { mutateAsync: processAction } = useProcessAction();
    const { mutateAsync: updateAction } = useUpdateAction();
    const { mutateAsync: icrc112Execute } = useIcrc112Execute();

    const primaryIntents = usePrimaryIntents(action?.intents);
    const cashierFeeIntents = useCashierFeeIntents(action?.intents);

    const { isDisabled, setIsDisabled, buttonText, setButtonText } = useConfirmButtonState(
        action?.state,
        t,
    );

    const handleSetLinkToActive = async () => {
        const activeLink = await setLinkActive({ link: link! });
        setLink(activeLink);

        navigate(`/details/${link!.id}`);
    };

    const startTransaction = async () => {
        const firstUpdatedAction = await processAction({
            linkId: link!.id,
            actionType: ACTION_TYPE.CREATE_LINK,
            actionId: action!.id,
        });
        setAction(firstUpdatedAction);

        const response = await icrc112Execute(firstUpdatedAction!.icrc112Requests);
        console.log("🚀 ~ startTransaction ~ response:", response);

        setTimeout(async () => {
            const secondUpdatedAction = await updateAction({
                actionId: action!.id,
                linkId: link!.id,
                external: true,
            });
            console.log("🚀 ~ startTransaction ~ secondUpdatedAction:", secondUpdatedAction);

            if (secondUpdatedAction) {
                setAction(secondUpdatedAction);
                onActionResult(secondUpdatedAction);
            }
        }, 10000);
    };

    const onClickSubmit = async () => {
        const isTxSuccess = action?.state === ACTION_STATE.SUCCESS;

        setIsDisabled(true);
        setButtonText(t("transaction.confirm_popup.processing"));

        if (isTxSuccess) {
            await handleSetLinkToActive();
        } else {
            await startTransaction();
        }
    };

    return (
        <Drawer open={open}>
            <DrawerContent className="max-w-[400px] h-[65%] mx-auto p-3 rounded-[1.5rem]">
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

                        <ConfirmationPopupFeesSection intents={cashierFeeIntents} isUsd={isUsd} />
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
