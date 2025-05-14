import { FC, useState } from "react";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { ConfirmationPopupAssetsSection } from "./confirmation-drawer-assets-section";
import { useConfirmButtonState } from "./confirmation-drawer.hooks";
import { ConfirmationPopupSkeleton } from "./confirmation-drawer-skeleton";
import { ACTION_STATE, ACTION_TYPE } from "@/services/types/enum";
import { ActionModel } from "@/services/types/action.service.types";
import { ConfirmationPopupLegalSection } from "./confirmation-drawer-legal-section";
import { isCashierError } from "@/services/errorProcess.service";
import { useIdentity } from "@nfid/identitykit/react";
import { useLinkAction } from "@/hooks/link-action-hooks";
import { useProcessAction, useProcessActionAnonymous, useUpdateAction } from "@/hooks/action-hooks";
import { ConfirmationPopupFeesSection } from "./confirmation-drawer-fees-section";
import { useIcrc112Execute } from "@/hooks/use-icrc-112-execute";

interface ConfirmationDrawerProps {
    open: boolean;
    onClose?: () => void;
    onInfoClick?: () => void;
    onCashierError?: (error: Error) => void;
    onActionResult?: (action: ActionModel) => void;
    onSuccessContinue?: () => Promise<void>;
    polling?: boolean;
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

    const { isDisabled, setIsDisabled, buttonText, setButtonText } = useConfirmButtonState(
        action?.state,
        t,
    );

    console.log("[ConfirmationDrawer] action ", action);

    // Start polling for action status if polling is enabled
    // useEffect(() => {
    //     if (polling && action && action.state !== ACTION_STATE.SUCCESS) {
    //         console.log("Starting polling for action status...");
    //         const interval = setInterval(async () => {
    //             await refetchAction();
    //         }, 2000);

    //         return () => clearInterval(interval);
    //     }
    // }, []);

    // Countdown effect for success state

    // Reset countdown when drawer opens
    // useEffect(() => {
    //     if (open) {
    //         setCountdown(5);
    //     }
    // }, [open]);

    const handleProcessClaimAction = async () => {
        if (identity) {
            if (!link) throw new Error("Link is not defined");
            if (!action) throw new Error("Action is not defined");
            // Process action for logged in user to claim

            // currentLinkId can different from link.id
            // in create link flow, the link id can be local_link which is not sync in backend
            const linkId = link.id;

            if (!linkId) throw new Error("Link ID is not defined");
            const startTime = Date.now();

            console.log("[handleProcessClaimAction] Starting processAction...");
            const processActionStartTime = Date.now();
            const processActionResult = await processAction({
                linkId: linkId,
                actionType: action?.type ?? ACTION_TYPE.CREATE_LINK,
                actionId: action.id,
            });
            const processActionEndTime = Date.now();
            const processActionDuration = (processActionEndTime - processActionStartTime) / 1000;
            console.log(
                `[handleProcessClaimAction] processAction completed in ${processActionDuration.toFixed(2)}s`,
            );

            if (processActionResult.icrc112Requests) {
                console.log("[handleProcessClaimAction] Starting icrc112Execute...");
                const icrc112StartTime = Date.now();
                const response = await icrc112Execute({
                    transactions: processActionResult.icrc112Requests,
                });
                const icrc112EndTime = Date.now();
                const icrc112Duration = (icrc112EndTime - icrc112StartTime) / 1000;
                console.log(
                    `[handleProcessClaimAction] icrc112Execute completed in ${icrc112Duration.toFixed(2)}s`,
                );

                if (response) {
                    console.log("[handleProcessClaimAction] Starting updateAction...");
                    const updateActionStartTime = Date.now();
                    const secondUpdatedAction = await updateAction({
                        actionId: action.id,
                        linkId: linkId,
                        external: true,
                    });
                    const updateActionEndTime = Date.now();
                    const updateActionDuration =
                        (updateActionEndTime - updateActionStartTime) / 1000;
                    console.log(
                        `[handleProcessClaimAction] updateAction completed in ${updateActionDuration.toFixed(2)}s`,
                    );

                    if (secondUpdatedAction) {
                        console.log(
                            "Setting action after updateAction in claim flow:",
                            secondUpdatedAction,
                        );
                        setAction(secondUpdatedAction);
                        onActionResult(secondUpdatedAction);
                    }
                }
            }

            if (processActionResult) {
                setAction(processActionResult);
                onActionResult(processActionResult);
            }

            const endTime = Date.now();
            const duration = endTime - startTime;
            const durationInSeconds = (duration / 1000).toFixed(2);

            console.log(
                "[handleProcessClaimAction] Total claim process completed in",
                `${durationInSeconds}s`,
            );
        } else {
            //Process action for anonymous user to claim
            const processActionResult = await processActionAnonymous({
                linkId: link!.id,
                actionId: action!.id,
                walletAddress: anonymousWalletAddress ?? "",
                actionType: ACTION_TYPE.CLAIM_LINK,
            });
            if (processActionResult) {
                console.log(
                    "Setting action after processActionAnonymous in claim flow:",
                    processActionResult,
                );
                setAction(processActionResult);
                onActionResult(processActionResult);
            }
        }
    };

    const handleProcessCreateAction = async () => {
        if (!link) throw new Error("Link is not defined");
        if (!action) throw new Error("Action is not defined");
        const start = Date.now();

        console.log("[handleProcessCreateAction] Starting processAction...");
        const processActionStartTime = Date.now();
        const firstUpdatedAction = await processAction({
            linkId: link.id,
            actionType: action?.type ?? ACTION_TYPE.CREATE_LINK,
            actionId: action.id,
        });
        const processActionEndTime = Date.now();
        const processActionDuration = (processActionEndTime - processActionStartTime) / 1000;
        console.log(
            `[handleProcessCreateAction] processAction completed in ${processActionDuration.toFixed(2)}s`,
        );

        setAction(firstUpdatedAction);

        if (firstUpdatedAction) {
            console.log("[handleProcessCreateAction] Starting icrc112Execute...");
            const icrc112StartTime = Date.now();
            const response = await icrc112Execute({
                transactions: firstUpdatedAction.icrc112Requests,
            });
            const icrc112EndTime = Date.now();
            const icrc112Duration = (icrc112EndTime - icrc112StartTime) / 1000;
            console.log(
                `[handleProcessCreateAction] icrc112Execute completed in ${icrc112Duration.toFixed(2)}s`,
            );

            if (response) {
                console.log("[handleProcessCreateAction] Starting updateAction...");
                const updateActionStartTime = Date.now();
                const secondUpdatedAction = await updateAction({
                    actionId: action.id,
                    linkId: link.id,
                    external: true,
                });
                const updateActionEndTime = Date.now();
                const updateActionDuration = (updateActionEndTime - updateActionStartTime) / 1000;
                console.log(
                    `[handleProcessCreateAction] updateAction completed in ${updateActionDuration.toFixed(2)}s`,
                );

                if (secondUpdatedAction) {
                    setAction(secondUpdatedAction);
                    onActionResult(secondUpdatedAction);
                }
            }
        }

        const end = Date.now();
        const duration = end - start;
        const durationInSeconds = (duration / 1000).toFixed(2);
        console.log(
            "[handleProcessCreateAction] Total create action process completed in",
            `${durationInSeconds}s`,
        );
    };

    const startTransaction = async () => {
        try {
            if (action?.state != ACTION_STATE.SUCCESS) {
                if (action?.type === ACTION_TYPE.CLAIM_LINK) {
                    await handleProcessClaimAction();
                } else {
                    await handleProcessCreateAction();
                }
            } else {
            }
        } catch (error) {
            console.log("🚀 ~ startTransaction ~ error:", error);
            if (isCashierError(error)) {
                onCashierError(error);
            } else {
                console.error(error);
            }
            setIsDisabled(false);
            setButtonText(t("confirmation_drawer.confirm_button"));
            throw error;
        }
    };

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
            // if (action.state === ACTION_STATE.SUCCESS) {
            //     return (
            //         <div className="flex flex-col items-center justify-center">
            //             <div className="flex items-center justify-center bg-lightgreen rounded-full p-2 my-4">
            //                 <Check color="#35A18A" size={42} />
            //             </div>
            //             <div className="text-center text-sm font-medium">
            //                 {t("confirmation_drawer.link_creation_success_message")}
            //             </div>

            //             <Button
            //                 className="mb-3 mt-8 mx-auto py-6 w-[95%]"
            //                 disabled={isDisabled}
            //                 onClick={onClickSubmit}
            //             >
            //                 {`${buttonText} (${countdown}s)`}
            //             </Button>
            //         </div>
            //     );
            // } else {
            return (
                <>
                    <ConfirmationPopupAssetsSection
                        intents={action.intents}
                        onInfoClick={onInfoClick}
                        isUsd={isUsd}
                        onUsdClick={() => setIsUsd((old) => !old)}
                    />
                    <ConfirmationPopupFeesSection intents={action.intents} />

                    <ConfirmationPopupLegalSection />
                    <Button
                        className="mx-auto w-[95%] disabled:bg-disabledgreen"
                        size={"default"}
                        disabled={isDisabled}
                        onClick={onClickSubmit}
                    >
                        {buttonText}
                    </Button>
                </>
            );
            // }
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
