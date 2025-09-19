// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

import { useEffect, useMemo, useState, useCallback } from "react";
import { useParams } from "react-router-dom";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  ACTION_TYPE,
  LINK_STATE,
  LINK_USER_STATE,
  LINK_TYPE,
} from "@/services/types/enum";
import SheetWrapper from "@/components/sheet-wrapper";
import {
  useLinkUserStateQuery,
  fetchLinkUserState,
} from "@/hooks/linkUserHooks";
import { isCashierError } from "@/services/errorProcess.service";
import { ActionModel } from "@/services/types/action.service.types";
import { LinkDetailModel } from "@/services/types/link.service.types";
import { useTranslation } from "react-i18next";
import { useLinkUseNavigation } from "@/hooks/useLinkNavigation";
import { useSkeletonLoading } from "@/hooks/useSkeletonLoading";
import LinkNotFound from "@/components/link-not-found";
import { MainAppLayout } from "@/components/ui/main-app-layout";
import { toast } from "sonner";
import { ConfirmationDrawerV2 } from "@/components/confirmation-drawer/confirmation-drawer-v2";
import { FeeInfoDrawer } from "@/components/fee-info-drawer/fee-info-drawer";
import { useLinkUsageValidation } from "@/hooks/form/useLinkUsageValidation";
import { isReceiveLinkType } from "@/utils/link-type.utils";
import UseLinkForm from "@/components/use-page/use-link-form";
import { useLinkDetailQuery } from "@/hooks/link-hooks";
import { useLinkMutations } from "@/hooks/useLinkMutations";
import { useUseConfirmation } from "@/hooks/tx-cart/useUseConfirmation";
import { UseSchema } from "@/components/use-page/use-link-options";
import { useTokensV2 } from "@/hooks/token/useTokensV2";
import { WalletSelectionModal } from "@/components/wallet-connect/wallet-selection-modal";
import usePnpStore from "@/stores/plugAndPlayStore";

export default function ChooseWalletPage() {
  const { linkId } = useParams();
  const { t } = useTranslation();
  const { renderSkeleton } = useSkeletonLoading();
  const { updateTokenInit } = useTokensV2();
  const { goToComplete, handleStateBasedNavigation, goToLinkDefault } =
    useLinkUseNavigation(linkId);
  const { validateAssetAndFees } = useLinkUsageValidation();
  const { account } = usePnpStore();

  // Form setup
  const form = useForm<z.infer<typeof UseSchema>>({
    resolver: zodResolver(UseSchema),
  });

  // Data fetching with new hooks
  const {
    data: linkDetailData,
    isLoading: isLoadingLinkData,
    refetch: refetchLinkDetailFn,
  } = useLinkDetailQuery(linkId, ACTION_TYPE.USE);
  const {
    data: linkUserState,
    refetch: refetchLinkUserStateFn,
    isFetching: isUserStateLoading,
  } = useLinkUserStateQuery(
    {
      action_type: ACTION_TYPE.USE,
      link_id: linkId ?? "",
      anonymous_wallet_address: "",
    },
    !!linkId && !!account,
  );
  const { createAction, createActionAnonymous } = useLinkMutations();

  const link = linkDetailData?.link;

  const [showWalletModal, setShowWalletModal] = useState(false);

  // Local state
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [manuallyClosedDrawer, setManuallyClosedDrawer] = useState(false);

  // Use confirmation hook for all confirmation-related methods
  const { handleSuccessContinue, handleConfirmTransaction, onCashierError } =
    useUseConfirmation({
      action: linkUserState?.action,
      linkId: linkId ?? "",
      link: link!,
      anonymousWalletAddress: undefined,
      refetchLinkUserStateFn,
      refetchLinkDetailFn,
    });

  // Button state
  const [useLinkButton, setUseLinkButton] = useState<{
    text: string;
    disabled: boolean;
  }>({
    text: t("confirmation_drawer.confirm_button"),
    disabled: false,
  });

  // Initialize tokens when link data is available
  useEffect(() => {
    if (link) {
      updateTokenInit();
    }
  }, []);

  // Handle state-based navigation for logged-in users
  useEffect(() => {
    if (link && account) {
      handleStateBasedNavigation(linkUserState, true);
    }
  }, [link, account]);

  // Show confirmation drawer when action is available
  useEffect(() => {
    if (!manuallyClosedDrawer && linkUserState?.action) {
      console.log("Setting showConfirmation to true");
      setShowConfirmation(true);
    }
  }, [manuallyClosedDrawer, linkUserState]);

  // Update button state based on loading state
  useEffect(() => {
    setUseLinkButton((prev) => ({
      ...prev,
      disabled: !!isUserStateLoading,
    }));
  }, [isUserStateLoading]);

  /**
   * Creates an action for authenticated users
   */
  const handleCreateActionForUser = async (): Promise<ActionModel> => {
    const newAction = await createAction({
      linkId: linkId!,
      actionType: ACTION_TYPE.USE,
    });
    return newAction;
  };

  /**
   * Creates an action for anonymous users
   */
  const handleCreateActionAnonymous = async (
    walletAddress: string,
  ): Promise<ActionModel> => {
    const newAction = await createActionAnonymous({
      linkId: linkId!,
      walletAddress: walletAddress,
      actionType: ACTION_TYPE.USE,
    });
    return newAction;
  };

  /**
   * Initiates the process of using a link
   * Accept wallet address for anonymous users
   */
  const initiateUseLinkAction = async (providedWalletAddress?: string) => {
    // Don't proceed if initial data is still loading
    if (isUserStateLoading || !link) {
      return;
    }

    // Use provided address or the one already stored
    const addressToUse = providedWalletAddress;

    if (!account && !addressToUse) {
      toast.error(t("link_detail.error.use_without_login_or_wallet"));
      return;
    }

    try {
      // Validation for send-type links to ensure sufficient balance
      if (isReceiveLinkType(link.linkType as LINK_TYPE)) {
        const validationResult = await validateAssetAndFees(link);
        if (!validationResult.isValid) {
          const msg = validationResult.errors
            .map((error) => error.message)
            .join(", ");
          throw new Error(msg);
        }
      }

      setUseLinkButton({
        text: useLinkButton.text,
        disabled: true,
      });

      if (linkUserState?.action) {
        setShowConfirmation(true);
      } else if (account) {
        // Authenticated user flow
        const action = await handleCreateActionForUser();
        if (action) {
          await refetchLinkUserStateFn();
          setShowConfirmation(true);
        }
      } else if (addressToUse) {
        // Anonymous user flow
        const anonymousLinkUserState = await fetchLinkUserState({
          action_type: ACTION_TYPE.USE,
          link_id: linkId ?? "",
          anonymous_wallet_address: addressToUse,
        });

        if (!anonymousLinkUserState) {
          toast.error(t("link_detail.error.use_without_login_or_wallet"));
          return;
        }

        if (!anonymousLinkUserState.link_user_state) {
          await handleCreateActionAnonymous(addressToUse);
          await fetchLinkUserState({
            action_type: ACTION_TYPE.USE,
            link_id: linkId ?? "",
            anonymous_wallet_address: addressToUse,
          });
          setShowConfirmation(true);
        } else if (
          anonymousLinkUserState.link_user_state === LINK_USER_STATE.COMPLETED
        ) {
          goToComplete();
        } else {
          await refetchLinkUserStateFn();
          setShowConfirmation(true);
        }
      } else {
        toast.error(t("link_detail.error.use_without_login_or_wallet"));
      }
    } catch (error) {
      console.error("Error initiating use link action:", error);
      if (isCashierError(error)) {
        onCashierError(error as Error);
      }
    } finally {
      setUseLinkButton({
        text: useLinkButton.text,
        disabled: false,
      });
    }
  };

  const handleOpenWalletModal = () => {
    setShowWalletModal(true);
  };

  const memoizedOnBack = useMemo(
    () => () => {
      goToLinkDefault();
    },
    [goToLinkDefault],
  );

  const setDisabled = useCallback((disabled: boolean) => {
    setUseLinkButton((prev) => ({
      ...prev,
      disabled: disabled,
    }));
  }, []);

  // Early return for inactive links
  if (
    link?.state === LINK_STATE.INACTIVE ||
    link?.state === LINK_STATE.INACTIVE_ENDED
  ) {
    return <LinkNotFound />;
  }

  return (
    <MainAppLayout>
      <SheetWrapper>
        {isLoadingLinkData && !link ? (
          renderSkeleton()
        ) : (
          <>
            <div className="w-full h-full flex flex-grow flex-col">
              <UseLinkForm
                form={form}
                formData={link ?? ({} as LinkDetailModel)}
                onSubmit={initiateUseLinkAction}
                onBack={memoizedOnBack}
                isDisabled={useLinkButton.disabled}
                setDisabled={setDisabled}
                buttonText={
                  useLinkButton.text || t("confirmation_drawer.confirm_button")
                }
                onOpenWalletModal={handleOpenWalletModal}
              />
            </div>

            <WalletSelectionModal
              isWalletModalOpen={showWalletModal}
              onOpenChange={setShowWalletModal}
              onWalletConnected={() => {}}
              allowChangeWallet={true}
            />

            <FeeInfoDrawer open={showInfo} onClose={() => setShowInfo(false)} />

            <ConfirmationDrawerV2
              open={showConfirmation}
              link={link!}
              action={linkUserState?.action}
              onClose={() => {
                setShowConfirmation(false);
                setManuallyClosedDrawer(true);
              }}
              onInfoClick={() => setShowInfo(true)}
              onCashierError={onCashierError}
              handleSuccessContinue={handleSuccessContinue}
              handleConfirmTransaction={handleConfirmTransaction}
            />
          </>
        )}
      </SheetWrapper>
    </MainAppLayout>
  );
}
