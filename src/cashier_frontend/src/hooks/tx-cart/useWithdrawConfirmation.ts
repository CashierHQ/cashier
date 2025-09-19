// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

import { useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { ACTION_TYPE } from "@/services/types/enum";
import { ActionModel } from "@/services/types/action.service.types";
import { LinkDetailModel } from "@/services/types/link.service.types";
import { useProcessAction, useUpdateAction } from "@/hooks/action-hooks";
import { useLinkMutations } from "@/hooks/useLinkMutations";

interface UseWithdrawConfirmationProps {
  linkId: string;
  link: LinkDetailModel;
  currentAction: ActionModel | undefined;
  setCurrentAction: (action: ActionModel | undefined) => void;
  refetchLinkDetail: () => Promise<unknown>;
  setShowConfirmationDrawer: (show: boolean) => void;
}

interface UseWithdrawConfirmationReturn {
  handleSuccessContinue: () => Promise<void>;
  handleConfirmTransaction: () => Promise<void>;
  onActionResult: (action: ActionModel) => void;
  onCashierError: (error: Error) => void;
}

export const useWithdrawConfirmation = ({
  linkId,
  link,
  currentAction,
  setCurrentAction,
  refetchLinkDetail,
  setShowConfirmationDrawer,
}: UseWithdrawConfirmationProps): UseWithdrawConfirmationReturn => {
  const { t } = useTranslation();

  // Mutation hooks
  const { mutateAsync: processAction } = useProcessAction();
  const { mutateAsync: updateAction } = useUpdateAction();
  const { callLinkStateMachine } = useLinkMutations();

  /**
   * Processes the withdrawal transaction
   */
  const handleWithdrawProcess = useCallback(async () => {
    try {
      if (!link) throw new Error("Link is not defined");
      if (!currentAction) throw new Error("Action is not defined");
      await processAction({
        linkId: link.id,
        actionType: ACTION_TYPE.WITHDRAW,
        actionId: currentAction.id,
      });
    } catch (error) {
      console.error("Error in withdrawal process:", error);
      throw error;
    }
  }, [
    link,
    currentAction,
    linkId,
    processAction,
    updateAction,
    setCurrentAction,
  ]);

  /**
   * Sets the link to inactive ended state after successful withdrawal
   */
  const setInactiveEndedLink = useCallback(async () => {
    try {
      if (!link) throw new Error("Link data is not available");

      const res = await callLinkStateMachine({
        linkId: link.id,
        linkModel: {},
        isContinue: true,
      });
      console.log("Link state machine response:", res);

      await refetchLinkDetail();
      setShowConfirmationDrawer(false);
    } catch (error) {
      console.error("Error setting link inactive:", error);
      throw error;
    }
  }, [
    link,
    callLinkStateMachine,
    refetchLinkDetail,
    setShowConfirmationDrawer,
  ]);

  /**
   * Handles successful withdrawal continuation
   */
  const handleSuccessContinue = useCallback(async () => {
    await setInactiveEndedLink();
  }, [setInactiveEndedLink]);

  /**
   * Starts the withdrawal transaction process
   */
  const handleConfirmTransaction = useCallback(async () => {
    await handleWithdrawProcess();
  }, [handleWithdrawProcess]);

  /**
   * Handles action result updates
   */
  const onActionResult = useMemo(
    () => (actionResult: ActionModel) => {
      setCurrentAction(actionResult);
    },
    [setCurrentAction],
  );

  /**
   * Handles cashier errors with toast notifications and closes confirmation drawer
   */
  const onCashierError = useMemo(
    () => (error: Error) => {
      toast.error(t("common.error"), {
        description: error.message,
      });
      console.error("Cashier error:", error);
      setShowConfirmationDrawer(false);
    },
    [t, setShowConfirmationDrawer],
  );

  return {
    handleSuccessContinue,
    handleConfirmTransaction,
    onActionResult,
    onCashierError,
  };
};
