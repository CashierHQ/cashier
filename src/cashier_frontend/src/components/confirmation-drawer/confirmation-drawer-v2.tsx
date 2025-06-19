// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

import { FC, useEffect, useState } from "react";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { ConfirmationPopupAssetsSection } from "./confirmation-drawer-assets-section";
import { ConfirmationPopupSkeleton } from "./confirmation-drawer-skeleton";
import { ACTION_STATE } from "@/services/types/enum";
import { ActionModel } from "@/services/types/action.service.types";
import { ConfirmationPopupLegalSection } from "./confirmation-drawer-legal-section";
import { ConfirmationPopupFeesSection } from "./confirmation-drawer-fees-section";
import { FeeHelpers } from "@/services/fee.service";
import { useLinkAction } from "@/hooks/useLinkAction";

/**
 * Props interface for the ConfirmationDrawerV2 component
 */
interface ConfirmationDrawerV2Props {
    /** The action model containing all information about the current action */
    action?: ActionModel;

    /** Controls whether the drawer is visible */
    open: boolean;

    /** Called when the drawer is closed */
    onClose?: () => void;

    /** Called when the info button is clicked, typically to show fee information */
    onInfoClick?: () => void;

    /** Called after the action result is received, to update UI or state */
    onActionResult?: (action: ActionModel) => void;

    /** Called when an error occurs during the transaction process */
    onCashierError?: (error: Error) => void;

    /** The main function that handles the transaction process. Use for both confirm and retry*/
    handleConfirmTransaction: () => Promise<void>;
    /** Called after a successful transaction to continue the workflow */
    handleSuccessContinue?: () => Promise<void>;
    /** The max action number for the link, required for fee calculation */
    maxActionNumber?: number;
}

/**
 * Enhanced confirmation drawer component for displaying action details and handling transactions
 *
 * This component is designed to be completely configurable via props, without relying on hooks
 * for internal state. This makes it more flexible for use in different workflows.
 */
// TODO: remove all the props that are not used in the component
export const ConfirmationDrawerV2: FC<ConfirmationDrawerV2Props> = ({
    open,
    action,
    onClose = () => {},
    // onActionResult = () => {},
    onCashierError = () => {},
    handleSuccessContinue: onSuccessContinue = async () => {},
    handleConfirmTransaction,
    maxActionNumber,
}) => {
    const { t } = useTranslation();
    /** Toggle state for showing USD values instead of token values */
    const [countdown, setCountdown] = useState(0);
    const { link } = useLinkAction();

    /**
     * Determine button text based on provided prop or action state
     * Uses the action state as a fallback if no buttonText prop is provided
     */
    const [button, setButton] = useState({
        text: "",
        disabled: false,
    });

    useEffect(() => {
        //  countdown is active, ALWAYS show countdown regardless of buttonText
        if (action?.state === ACTION_STATE.SUCCESS && countdown > 0) {
            // Make countdown super explicit
            setButton({
                text: `Continue in ${countdown}s`,
                disabled: false, // Button should not be disabled during countdown
            });
        } else if (action?.state === ACTION_STATE.SUCCESS) {
            setButton({
                text: t("confirmation_drawer.continue_button"),
                disabled: false, // Button should not be disabled on success
            });
        } else if (action?.state === ACTION_STATE.PROCESSING) {
            setButton({
                text: t("confirmation_drawer.processing"),
                disabled: true, // Button should not be disabled on success
            });
        } else if (action?.state === ACTION_STATE.FAIL) {
            setButton({
                text: t("confirmation_drawer.retry_button"),
                disabled: false, // Allow retrying
            });
        } else {
            // Default case for new actions or when no action is provided
            setButton({
                text: t("confirmation_drawer.confirm_button"),
                disabled: false, // Button should not be disabled on initial submission
            });
        }
    }, [action?.state]);

    // When in SUCCESS state and
    /**
     * Handles the submit button click
     * Updates button state and calls appropriate handler based on action state
     */
    const onClickSubmit = async () => {
        // Determine if this is a successful transaction completion
        const isTxSuccess = action?.state === ACTION_STATE.SUCCESS;

        setButton({
            text: t("confirmation_drawer.processing"),
            disabled: true, // Button should not be disabled on success
        });
        // Reset countdown when manually clicking
        setCountdown(0);

        try {
            // Call appropriate handler based on transaction state
            if (isTxSuccess) {
                // For successful transactions, continue to next step
                await onSuccessContinue();
            } else {
                // For new or failed transactions, start/retry the transaction
                await handleConfirmTransaction();
            }
        } catch (e) {
            const errorMessage = e instanceof Error ? e : new Error("unknown error");
            onCashierError(errorMessage);
        } finally {
            // Reset button state after action is complete
            setButton({
                text: t("confirmation_drawer.confirm_button"),
                disabled: false, // Re-enable button for next action
            });
        }
        // normally the tx cart will close and page changed after this call, there for no need to update the button state here
    };

    /**
     * Start countdown timer ONLY when action state changes to SUCCESS
     */
    useEffect(() => {
        // Start timer ONLY when action state becomes SUCCESS
        if (action?.state === ACTION_STATE.SUCCESS && open) {
            setCountdown(5);
        }
    }, [action?.state, open]);

    /**
     * Handle countdown logic in a separate effect
     */
    useEffect(() => {
        // Only run the countdown if the drawer is open
        if (countdown <= 0 || !open) return;

        const timer = setTimeout(() => {
            setCountdown((prev) => prev - 1);
        }, 1000);

        return () => clearTimeout(timer);
    }, [countdown, open]);

    /**
     * Auto-trigger button when countdown reaches 0
     */
    useEffect(() => {
        // Only auto-trigger if the drawer is open
        if (countdown === 1 && open) {
            const timer = setTimeout(async () => {
                await onClickSubmit();
            }, 1000);
            return () => clearTimeout(timer);
        }
    }, [countdown, onClickSubmit, open]);

    /**
     * Give 0.5s delay before enabling the button.
     * Clear the timeout when the component unmounts.
     */
    useEffect(() => {
        console.log("Drawer open state changed:", open);
        if (open) {
            setButton((...pre) => {
                return { ...pre[0], disabled: true };
            });

            const disableButtonTimeout = setTimeout(() => {
                setButton((...pre) => {
                    return { ...pre[0], disabled: false };
                });
            }, 500);

            return () => clearTimeout(disableButtonTimeout);
        }
    }, [open]);

    /**
     * Reset countdown when drawer closes
     */
    useEffect(() => {
        console.log("Drawer open state changed: 2", open);
        if (!open) {
            console.log("Drawer closed, resetting countdown");
            setCountdown(0);
        }
    }, [open]);

    /**
     * Determine the appropriate title based on action state
     */
    const title =
        action?.state === ACTION_STATE.SUCCESS
            ? t("confirmation_drawer.link_creation_success_title")
            : t("confirmation_drawer.title");

    /**
     * Renders the content of the drawer based on the current action state
     * Shows skeleton loading state if no action is available
     */
    const getContent = (action: ActionModel | undefined) => {
        if (action) {
            return (
                <>
                    <ConfirmationPopupAssetsSection
                        actionType={action.type}
                        intents={action.intents}
                    />
                    {FeeHelpers.shouldDisplayFeeBasedOnIntent(
                        link?.linkType || "",
                        action.type,
                        action.intents[0].task,
                    ) && (
                        <ConfirmationPopupFeesSection
                            intents={action.intents}
                            maxActionNumber={maxActionNumber}
                        />
                    )}
                    <ConfirmationPopupLegalSection />
                    <Button
                        className="my-2 mx-auto w-[95%] disabled:bg-disabledgreen"
                        disabled={button.disabled}
                        onClick={onClickSubmit}
                    >
                        {button.text}
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
