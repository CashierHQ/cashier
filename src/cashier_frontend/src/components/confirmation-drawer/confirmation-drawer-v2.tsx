// Cashier — No-code blockchain transaction builder
// Copyright (C) 2025 TheCashierApp LLC
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with this program.  If not, see <https://www.gnu.org/licenses/>.

import { FC, useState, useEffect, useRef } from "react";
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

    /** Called after a successful transaction to continue the workflow */
    onSuccessContinue?: () => Promise<void>;

    /** The main function that handles the transaction process */
    startTransaction: () => Promise<void>;

    /** Controls whether the action button is disabled */
    isButtonDisabled?: boolean;

    /** Function to update the button's disabled state */
    setButtonDisabled?: (disabled: boolean) => void;

    /** The text to display on the action button */
    buttonText?: string;

    /** Function to update the action button's text */
    setButtonText?: (text: string) => void;
}

/**
 * Enhanced confirmation drawer component for displaying action details and handling transactions
 *
 * This component is designed to be completely configurable via props, without relying on hooks
 * for internal state. This makes it more flexible for use in different workflows.
 */
export const ConfirmationDrawerV2: FC<ConfirmationDrawerV2Props> = ({
    open,
    action,
    onClose = () => {},
    onInfoClick = () => {},
    // onActionResult = () => {},
    onCashierError = () => {},
    onSuccessContinue = async () => {},
    startTransaction,
    isButtonDisabled = false,
    setButtonDisabled,
    buttonText,
    setButtonText,
}) => {
    const { t } = useTranslation();
    /** Toggle state for showing USD values instead of token values */
    const [isUsd, setIsUsd] = useState(false);
    const [continueButtonTimer, setContinueButtonTimer] = useState(5);
    const [isTimerRunning, setIsTimerRunning] = useState(false);
    const timerIntervalRef = useRef<number | null>(null);
    const [initialLoading, setInitialLoading] = useState(false);

    // Add initial delay when component loads with non-success state
    useEffect(() => {
        if (open && action && action.state !== ACTION_STATE.SUCCESS) {
            setInitialLoading(true);
            const timer = setTimeout(() => {
                setInitialLoading(false);
            }, 500);

            return () => clearTimeout(timer);
        }
    }, [open, action]);

    // Effect to handle the countdown timer
    useEffect(() => {
        // Clean up function to clear any existing interval
        const cleanupTimer = () => {
            if (timerIntervalRef.current !== null) {
                clearInterval(timerIntervalRef.current);
                timerIntervalRef.current = null;
            }
        };

        // Start timer if it's running
        if (isTimerRunning && continueButtonTimer > 0) {
            timerIntervalRef.current = setInterval(() => {
                setContinueButtonTimer((prev) => {
                    const newValue = prev - 1;
                    if (newValue <= 0) {
                        cleanupTimer();
                        // When timer reaches 0, continue to next step
                        onSuccessContinue().catch((e) => {
                            console.error("Error in onSuccessContinue:", e);
                            onCashierError(e instanceof Error ? e : new Error("Continue failed"));
                        });
                        setIsTimerRunning(false);
                        return 0;
                    }
                    return newValue;
                });
            }, 1000);
        }

        // Cleanup interval on component unmount or when timer is stopped
        return cleanupTimer;
    }, [isTimerRunning, continueButtonTimer, onSuccessContinue, onCashierError]);

    /**
     * Determine button text based on provided prop or action state
     * Uses the action state as a fallback if no buttonText prop is provided
     */
    const displayButtonText =
        buttonText ||
        (action?.state === ACTION_STATE.SUCCESS
            ? t("confirmation_drawer.processing")
            : action?.state === ACTION_STATE.PROCESSING
              ? t("confirmation_drawer.inprogress_button")
              : action?.state === ACTION_STATE.FAIL
                ? t("retry")
                : t("confirmation_drawer.confirm_button"));

    /**
     * Handles the submit button click
     * Updates button state and calls appropriate handler based on action state
     */
    const onClickSubmit = async () => {
        // Determine if this is a successful transaction completion
        const isTxSuccess = action?.state === ACTION_STATE.SUCCESS;

        // Update button state
        if (setButtonDisabled) {
            setButtonDisabled(true);
        }

        if (setButtonText) {
            setButtonText(t("confirmation_drawer.processing"));
        }

        try {
            // Call appropriate handler based on transaction state
            if (isTxSuccess) {
                // For successful transactions, proceed immediately
                await onSuccessContinue();
            } else {
                // For new or failed transactions, start/retry the transaction
                await startTransaction();
                // Start the timer after transaction is initiated
                setContinueButtonTimer(5);
                setIsTimerRunning(true);
            }
        } catch (e) {
            const errorMessage = e instanceof Error ? e : new Error("unknown error");
            onCashierError(errorMessage);
        } finally {
            setButtonDisabled?.(false);
        }
    };

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
                        intents={action.intents}
                        onInfoClick={onInfoClick}
                        isUsd={isUsd}
                        onUsdClick={() => setIsUsd((old) => !old)}
                    />
                    <ConfirmationPopupFeesSection intents={action.intents} />
                    <ConfirmationPopupLegalSection />
                    <Button
                        className="my-2 mx-auto w-[95%] disabled:bg-disabledgreen"
                        disabled={isButtonDisabled || initialLoading}
                        onClick={onClickSubmit}
                    >
                        {initialLoading ? t("loading") : displayButtonText}
                        {action?.state === ACTION_STATE.SUCCESS && ` (${continueButtonTimer}s)`}
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
