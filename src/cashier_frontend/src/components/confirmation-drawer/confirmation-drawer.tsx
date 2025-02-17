import { FC } from "react";
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
import { useCreateLinkStore } from "@/stores/createLinkStore";
import { ACTION_STATE } from "@/services/types/enum";
import { useNavigate } from "react-router-dom";
import { useCreateAction, useIcrcxExecute, useSetLinkActive } from "@/hooks/linkHooks";

interface ConfirmationDrawerProps {
    open: boolean;
    onClose: () => void;
    onInfoClick: () => void;
}

export const ConfirmationDrawer: FC<ConfirmationDrawerProps> = ({ open, onClose, onInfoClick }) => {
    const navigate = useNavigate();
    const { t } = useTranslation();
    const { link, setLink, action, setAction } = useCreateLinkStore();

    const { mutateAsync: setLinkActive } = useSetLinkActive();
    const { mutateAsync: createAction } = useCreateAction();
    const { mutateAsync: icrcxExecute } = useIcrcxExecute();

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
        const createdAction = await createAction({ linkId: link!.id, actionId: action!.id });

        setAction(createdAction);

        await icrcxExecute(action!.icrc112Requests);
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

        setIsDisabled(false);
    };

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
                {action ? (
                    <>
                        <ConfirmationPopupAssetsSection
                            intents={primaryIntents}
                            onInfoClick={onInfoClick}
                        />

                        <ConfirmationPopupFeesSection intents={cashierFeeIntents} />

                        <ConfirmationPopupLegalSection />

                        <Button disabled={isDisabled} onClick={onClickSubmit}>
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
