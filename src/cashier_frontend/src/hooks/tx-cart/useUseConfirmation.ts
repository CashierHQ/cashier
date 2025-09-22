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
  useUpdateAction,
} from "@/hooks/action-hooks";
import { useIcrc112Execute } from "@/hooks/use-icrc-112-execute";
import {
  LINK_USER_STATE_QUERY_KEYS,
  useUpdateLinkUserState,
} from "@/hooks/linkUserHooks";
import { useLinkUseNavigation } from "@/hooks/useLinkNavigation";
import { useLinkUsageValidation } from "@/hooks/form/useLinkUsageValidation";
import {
  getCashierError,
  isCashierError,
} from "@/services/errorProcess.service";
import { isReceiveLinkType } from "@/utils/link-type.utils";

import usePnpStore from "@/stores/plugAndPlayStore";
import { useQueryClient } from "@tanstack/react-query";

interface UseUseConfirmationProps {
  linkId: string;
  link: LinkDetailModel;
  action?: ActionModel;
  anonymousWalletAddress?: string;
  refetchLinkUserStateFn: () => Promise<unknown>;
  refetchLinkDetailFn: () => Promise<unknown>;
}

interface UseUseConfirmationReturn {
  handleSuccessContinue: () => Promise<void>;
  handleConfirmTransaction: () => Promise<void>;
  onActionResult: (action: ActionModel) => void;
  onCashierError: (error: Error) => void;
}

export const useUseConfirmation = ({
  action,
  linkId,
  link,
  anonymousWalletAddress = "",
  refetchLinkUserStateFn,
  refetchLinkDetailFn,
}: UseUseConfirmationProps): UseUseConfirmationReturn => {
  const { t } = useTranslation();
  const { goToComplete } = useLinkUseNavigation(linkId);
  const { validateAssetAndFees } = useLinkUsageValidation();
  const { pnp, account } = usePnpStore();

  // Mutation hooks
  const { mutateAsync: processAction } = useProcessAction();
  const { mutateAsync: updateAction } = useUpdateAction();
  const { mutateAsync: icrc112Execute } = useIcrc112Execute();
  const queryClient = useQueryClient();
  const updateLinkUserState = useUpdateLinkUserState(linkId);

  const enhancedRefresh = useCallback(async () => {
    try {
      await refetchLinkUserStateFn();
      await refetchLinkDetailFn();
    } catch (error) {
      console.error("Error in enhanced refresh:", error);
      throw error;
    }
  }, []);

  /**
   * Processes the use action with the backend
   */
  const handleProcessUseAction = async () => {
    if (!link) throw new Error("Link is not defined");
    if (!action) {
      throw new Error("Action is not defined");
    }
    if (!pnp) {
      throw new Error("Pnp is not defined");
    }

    if (!account) {
      throw new Error("Account is not defined");
    }

    const processActionResult = await processAction({
      linkId: link.id,
      actionType: action.type,
      actionId: action.id,
    });

    // Execute ICRC-1 transactions if needed
    if (
      processActionResult.icrc112Requests &&
      processActionResult.icrc112Requests?.length > 0
    ) {
      const response = await icrc112Execute({
        transactions: processActionResult.icrc112Requests,
      });

      if (response) {
        await updateAction({
          actionId: action?.id,
          linkId: link.id,
          external: true,
        });
        // invalidate queries to refresh user link state
        queryClient.invalidateQueries({
          queryKey: LINK_USER_STATE_QUERY_KEYS(
            linkId,
            pnp.account?.owner ?? "",
          ),
        });
      }


    }
    if (processActionResult) {
      await enhancedRefresh();
    }
  }
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
          action_type: ACTION_TYPE.USE,
          link_id: linkId,
          isContinue: true,
          anonymous_wallet_address: anonymousWalletAddress,
        },
      });

      if (!result) {
        throw new Error("Failed to update link user state");
      }

      try {
        await enhancedRefresh();
      } catch (refreshError) {
        console.error("Error during comprehensive data refresh:", refreshError);
      }

      if (result.link_user_state === LINK_USER_STATE.COMPLETED) {
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
