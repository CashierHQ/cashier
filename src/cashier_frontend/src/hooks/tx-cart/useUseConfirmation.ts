// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

import { useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import {
  ACTION_TYPE,
  ACTION_STATE,
  LINK_USER_STATE,
  LINK_TYPE,
} from "@/services/types/enum";
import { ActionModel } from "@/services/types/action.service.types";
import { LinkDetailModel } from "@/services/types/link.service.types";
import {
  useProcessAction,
  useProcessActionAnonymous,
  useUpdateAction,
} from "@/hooks/action-hooks";
import { useIcrc112Execute } from "@/hooks/use-icrc-112-execute";
import { useUpdateLinkUserState } from "@/hooks/linkUserHooks";
import { usePollingLinkUserState } from "@/hooks/polling/usePollingLinkUserState";
import { useLinkUseNavigation } from "@/hooks/useLinkNavigation";
import { useLinkUsageValidation } from "@/hooks/form/useLinkUsageValidation";
import {
  getCashierError,
  isCashierError,
} from "@/services/errorProcess.service";
import { isReceiveLinkType } from "@/utils/link-type.utils";

import { Identity } from "@dfinity/agent";

interface UseUseConfirmationProps {
  linkId: string;
  link: LinkDetailModel;
  internalAction: ActionModel | undefined;
  setInternalAction: (action: ActionModel | undefined) => void;
  anonymousWalletAddress?: string;
  identity: Identity | null | undefined;
  refetchLinkUserStateFn: () => Promise<unknown>;
  linkDetailQuery: {
    refetch: () => Promise<unknown>;
  };
}

interface UseUseConfirmationReturn {
  handleSuccessContinue: () => Promise<void>;
  handleConfirmTransaction: () => Promise<void>;
  onActionResult: (action: ActionModel) => void;
  onCashierError: (error: Error) => void;
}

export const useUseConfirmation = ({
  linkId,
  link,
  internalAction,
  setInternalAction,
  anonymousWalletAddress = "",
  identity,
  refetchLinkUserStateFn,
  linkDetailQuery,
}: UseUseConfirmationProps): UseUseConfirmationReturn => {
  const { t } = useTranslation();
  const { goToComplete } = useLinkUseNavigation(linkId);
  const { validateAssetAndFees } = useLinkUsageValidation();

  // Mutation hooks
  const { mutateAsync: processAction } = useProcessAction();
  const { mutateAsync: processActionAnonymous } = useProcessActionAnonymous();
  const { mutateAsync: updateAction } = useUpdateAction();
  const { mutateAsync: icrc112Execute } = useIcrc112Execute();
  const updateLinkUserState = useUpdateLinkUserState();

  // Polling hook
  const { startPolling, stopPolling } = usePollingLinkUserState({
    onUpdate: (action: ActionModel) => {
      setInternalAction(action);
    },
    onError: (error: Error) => {
      console.error("Polling error:", error);
    },
  });

  const enhancedRefresh = useCallback(async () => {
    try {
      await refetchLinkUserStateFn();
      await linkDetailQuery.refetch();
    } catch (error) {
      console.error("Error in enhanced refresh:", error);
      throw error;
    }
  }, [refetchLinkUserStateFn, linkDetailQuery]);

  /**
   * Processes the use action with the backend
   */
  const handleProcessUseAction = useCallback(async () => {
    if (!link) throw new Error("Link is not defined");
    if (!internalAction) throw new Error("Action is not defined");

    try {
      // Start polling action state to track changes from CREATED to SUCCESS
      if (identity) {
        startPolling(
          {
            action_type: ACTION_TYPE.USE_LINK,
            link_id: linkId,
            anonymous_wallet_address: "",
          },
          identity,
        );

        // Process action for authenticated user
        const processActionResult = await processAction({
          linkId: link.id,
          actionType: internalAction?.type ?? ACTION_TYPE.USE_LINK,
          actionId: internalAction.id,
        });
        setInternalAction(processActionResult);

        // Execute ICRC-1 transactions if needed
        if (
          processActionResult.icrc112Requests &&
          processActionResult.icrc112Requests?.length > 0
        ) {
          const response = await icrc112Execute({
            transactions: processActionResult.icrc112Requests,
          });

          if (response) {
            const updatedAction = await updateAction({
              actionId: internalAction.id,
              linkId: link.id,
              external: true,
            });

            if (updatedAction) {
              setInternalAction(updatedAction);
            }
          }
        }

        if (processActionResult) {
          await refetchLinkUserStateFn();
        }
      } else {
        // Process action for anonymous user
        const processActionResult = await processActionAnonymous({
          linkId: link.id,
          actionId: internalAction.id,
          walletAddress: anonymousWalletAddress,
          actionType: ACTION_TYPE.USE_LINK,
        });

        if (processActionResult) {
          setInternalAction(processActionResult);
          await refetchLinkUserStateFn();
        }
      }
    } finally {
      // Stop polling when done
      stopPolling();
    }
  }, [
    link,
    internalAction,
    identity,
    linkId,
    anonymousWalletAddress,
    processAction,
    processActionAnonymous,
    updateAction,
    icrc112Execute,
    refetchLinkUserStateFn,
    setInternalAction,
    startPolling,
    stopPolling,
  ]);

  /**
   * Starts the transaction process
   */
  const handleConfirmTransaction = useCallback(async () => {
    try {
      // Validation for send-type links
      if (isReceiveLinkType(link.linkType as LINK_TYPE)) {
        const validationResult = validateAssetAndFees(link);
        if (!validationResult.isValid) {
          const msg = validationResult.errors
            .map((error: { message: string }) => error.message)
            .join(", ");
          throw new Error(msg);
        }
      }
      await handleProcessUseAction();
    } catch (error) {
      console.error("Transaction error:", error);
      if (isCashierError(error)) {
        const cashierError = getCashierError(error);
        toast.error(t("common.error"), {
          description: cashierError.message,
        });
      }
    }
  }, [link, validateAssetAndFees, handleProcessUseAction, t]);

  /**
   * Updates link user state after successful transaction
   */
  const handleSuccessContinue = useCallback(async () => {
    try {
      const result = await updateLinkUserState.mutateAsync({
        input: {
          action_type: ACTION_TYPE.USE_LINK,
          link_id: linkId,
          isContinue: true,
          anonymous_wallet_address: anonymousWalletAddress,
        },
      });

      try {
        await enhancedRefresh();
      } catch (refreshError) {
        console.error("Error during comprehensive data refresh:", refreshError);
      }

      if (result.link_user_state === LINK_USER_STATE.COMPLETE) {
        setTimeout(() => {
          goToComplete({ replace: true });
        }, 500);
      }
    } catch (error) {
      if (isCashierError(error)) {
        const cashierError = getCashierError(error);
        toast.error(t("common.error"), {
          description: cashierError.message,
        });
      }
    }
  }, [
    updateLinkUserState,
    linkId,
    anonymousWalletAddress,
    enhancedRefresh,
    goToComplete,
    t,
  ]);

  /**
   * Handles action result notifications
   */
  const onActionResult = useMemo(
    () => (action: ActionModel) => {
      if (
        action.state === ACTION_STATE.SUCCESS ||
        action.state === ACTION_STATE.FAIL
      ) {
        const linkType = link?.linkType;
        if (action.state === ACTION_STATE.SUCCESS) {
          toast.success(t(`claim_page.${linkType}.transaction_success`));
        } else {
          toast.error(t(`claim_page.${linkType}.transaction_failed`));
        }
      }
    },
    [t, link?.linkType],
  );

  /**
   * Handles cashier errors with toast notifications
   */
  const onCashierError = useMemo(
    () => (error: Error) => {
      const cashierError = getCashierError(error);
      toast.error(t("common.error"), {
        description: cashierError.message,
      });
    },
    [t],
  );

  return {
    handleSuccessContinue,
    handleConfirmTransaction,
    onActionResult,
    onCashierError,
  };
};
