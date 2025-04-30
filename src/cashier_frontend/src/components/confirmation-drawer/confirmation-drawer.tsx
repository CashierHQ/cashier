import { FC, useState } from "react";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { useTranslation } from "react-i18next";
import { IoIosClose } from "react-icons/io";
import { Button } from "@/components/ui/button";
import { ConfirmationPopupAssetsSection } from "./confirmation-drawer-assets-section";
import { useConfirmButtonState, usePrimaryIntents } from "./confirmation-drawer.hooks";
import { ConfirmationPopupSkeleton } from "./confirmation-drawer-skeleton";
import { ACTION_STATE, ACTION_TYPE } from "@/services/types/enum";
import { useIcrc112Execute } from "@/hooks/linkHooks";
import { ActionModel } from "@/services/types/action.service.types";
import { ConfirmationPopupLegalSection } from "./confirmation-drawer-legal-section";
import { isCashierError } from "@/services/errorProcess.service";
import { useIdentity } from "@nfid/identitykit/react";
import { useLinkAction } from "@/hooks/link-action-hooks";
import { useProcessAction, useProcessActionAnonymous, useUpdateAction } from "@/hooks/action-hooks";
import { Check } from "lucide-react";

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
    const { link, action, anonymousWalletAddress, setAction } = useLinkAction();
    const identity = useIdentity();

    const [isUsd, setIsUsd] = useState(false);

    const { mutateAsync: processAction } = useProcessAction();
    const { mutateAsync: processActionAnonymous } = useProcessActionAnonymous();

    const { mutateAsync: updateAction } = useUpdateAction();
    const { mutateAsync: icrc112Execute } = useIcrc112Execute();

    const primaryIntents = usePrimaryIntents(action?.intents);

    const { isDisabled, setIsDisabled, buttonText, setButtonText } = useConfirmButtonState(
        action?.state,
        t,
    );

    const handleProcessClaimAction = async () => {
        if (identity) {
            if (!link) throw new Error("Link is not defined");
            if (!action) throw new Error("Action is not defined");
            // Process action for logged in user to claim

            // currentLinkId can different from link.id
            // in create link flow, the link id can be local_link which is not sync in backend
            const linkId = link.id;

            if (!linkId) throw new Error("Link ID is not defined");

            const processActionResult = await processAction({
                linkId: linkId,
                actionType: action?.type ?? ACTION_TYPE.CREATE_LINK,
                actionId: action.id,
            });

            if (processActionResult.icrc112Requests) {
                const response = await icrc112Execute({
                    transactions: processActionResult.icrc112Requests,
                });
                console.log("🚀 ~ icrc112Execute ~ response:", response);
                if (response) {
                    const secondUpdatedAction = await updateAction({
                        actionId: action.id,
                        linkId: linkId,
                        external: true,
                    });

                    console.log("🚀 ~ secondUpdatedAction:", secondUpdatedAction);

                    if (secondUpdatedAction) {
                        setAction(secondUpdatedAction);
                        onActionResult(secondUpdatedAction);
                    }
                }
            }

            if (processActionResult) {
                setAction(processActionResult);
                onActionResult(processActionResult);
            }
        } else {
            //Process action for anonymous user to claim
            const processActionResult = await processActionAnonymous({
                linkId: link!.id,
                actionId: action!.id,
                walletAddress: anonymousWalletAddress ?? "",
                actionType: ACTION_TYPE.CLAIM_LINK,
            });
            if (processActionResult) {
                setAction(processActionResult);
                onActionResult(processActionResult);
            }
        }
    };

    const handleProcessCreateAction = async () => {
        if (!link) throw new Error("Link is not defined");
        if (!action) throw new Error("Action is not defined");
        const firstUpdatedAction = await processAction({
            linkId: link.id,
            actionType: action?.type ?? ACTION_TYPE.CREATE_LINK,
            actionId: action.id,
        });
        setAction(firstUpdatedAction);
        if (firstUpdatedAction) {
            const response = await icrc112Execute({
                transactions: firstUpdatedAction.icrc112Requests,
            });
            console.log("🚀 ~ icrc112Execute ~ response:", response);
            if (response) {
                const secondUpdatedAction = await updateAction({
                    actionId: action!.id,
                    linkId: link!.id,
                    external: true,
                });

                if (secondUpdatedAction) {
                    setAction(secondUpdatedAction);
                    onActionResult(secondUpdatedAction);
                }
            }
        }
    };

    const startTransaction = async () => {
        try {
            if (action?.type === ACTION_TYPE.CLAIM_LINK) {
                await handleProcessClaimAction();
            } else {
                await handleProcessCreateAction();
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

    const title =
        action?.state === ACTION_STATE.SUCCESS
            ? t("transaction.confirm_popup.link_creation_success_title")
            : t("transaction.confirm_popup.title");

    return (
        <Drawer open={open}>
            <DrawerContent className="max-w-[400px] mx-auto p-3 rounded-t-[1.5rem]">
                <DrawerHeader>
                    <DrawerTitle className="relative flex items-center justify-center">
                        <div className="text-center text-xl">{title}</div>

                        <IoIosClose
                            onClick={onClose}
                            className="absolute right-0 cursor-pointer"
                            size={42}
                        />
                    </DrawerTitle>
                </DrawerHeader>

                {action ? (
                    action.state === ACTION_STATE.SUCCESS ? (
                        <div className="flex flex-col items-center justify-center">
                            <div className="flex items-center justify-center bg-lightgreen rounded-full p-2 my-4">
                                <Check color="#35A18A" size={42} />
                            </div>
                            <div className="text-center text-sm font-medium">
                                {t("transaction.confirm_popup.link_creation_success_message")}
                            </div>

                            <Button
                                className="mb-3 mt-8 mx-auto py-6 w-[95%]"
                                disabled={isDisabled}
                                onClick={onClickSubmit}
                            >
                                {buttonText}
                            </Button>
                        </div>
                    ) : (
                        <>
                            <ConfirmationPopupAssetsSection
                                intents={primaryIntents}
                                onInfoClick={onInfoClick}
                                isUsd={isUsd}
                                onUsdClick={() => setIsUsd((old) => !old)}
                            />

                            <ConfirmationPopupLegalSection />
                            <Button
                                className="my-3 mx-auto py-6 w-[95%] disabled:bg-disabledgreen"
                                disabled={isDisabled}
                                onClick={onClickSubmit}
                            >
                                {buttonText}
                            </Button>
                        </>
                    )
                ) : (
                    <ConfirmationPopupSkeleton />
                )}
            </DrawerContent>
        </Drawer>
    );
};
