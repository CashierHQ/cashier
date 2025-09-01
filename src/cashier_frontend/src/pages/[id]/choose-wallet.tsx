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
import { useLinkUserState, fetchLinkUserState } from "@/hooks/linkUserHooks";
import { isCashierError } from "@/services/errorProcess.service";
import { ActionModel } from "@/services/types/action.service.types";
import { LinkDetailModel } from "@/services/types/link.service.types";
import { useTranslation } from "react-i18next";
import { useLinkUseNavigation } from "@/hooks/useLinkNavigation";
import { useSkeletonLoading } from "@/hooks/useSkeletonLoading";
import LinkNotFound from "@/components/link-not-found";
import { MainAppLayout } from "@/components/ui/main-app-layout";
import { toast } from "sonner";
import { useIdentity } from "@nfid/identitykit/react";
import { ConfirmationDrawerV2 } from "@/components/confirmation-drawer/confirmation-drawer-v2";
import { FeeInfoDrawer } from "@/components/fee-info-drawer/fee-info-drawer";
import { useLinkUsageValidation } from "@/hooks/form/useLinkUsageValidation";
import { isReceiveLinkType } from "@/utils/link-type.utils";
import UseLinkForm from "@/components/use-page/use-link-form";
import { useLinkDetailQuery } from "@/hooks/link-hooks";
import { useLinkMutations } from "@/hooks/useLinkMutations";
import { useUseConfirmation } from "@/hooks/tx-cart/useUseConfirmation";
import { WalletSelectionModal } from "@/components/wallet-selection-modal";
import { UseSchema } from "@/components/use-page/use-link-options";
import { useTokensV2 } from "@/hooks/token/useTokensV2";

export default function ChooseWalletPage() {
  const { linkId } = useParams();
  const identity = useIdentity();
  const { t } = useTranslation();
  const { renderSkeleton } = useSkeletonLoading();
  const { updateTokenInit } = useTokensV2();
  const { goToComplete, handleStateBasedNavigation, goToLinkDefault } =
    useLinkUseNavigation(linkId);
  const { validateAssetAndFees } = useLinkUsageValidation();

  // Form setup
  const form = useForm<z.infer<typeof UseSchema>>({
    resolver: zodResolver(UseSchema),
  });

  // Data fetching with new hooks
  const linkDetailQuery = useLinkDetailQuery(linkId, ACTION_TYPE.USE);
  const { createAction, createActionAnonymous } = useLinkMutations();

  const link = linkDetailQuery.data?.link;
  const isLoadingLinkData = linkDetailQuery.isLoading;

  const {
    data: linkUserState,
    refetch: refetchLinkUserStateFn,
    isFetching: isUserStateLoading,
  } = useLinkUserState(
    {
      action_type: ACTION_TYPE.USE,
      link_id: linkId ?? "",
      anonymous_wallet_address: "",
    },
    !!linkId && !!identity
  );

  const queryAction = linkUserState?.action;

  // Internal action state that can be updated independently
  const [internalAction, setInternalAction] = useState<ActionModel | undefined>(
    queryAction
  );
  const [showWalletModal, setShowWalletModal] = useState(false);

  // Get wallet address from sessionStorage if available
  const storedWalletAddress =
    sessionStorage.getItem(`wallet-address-${linkId}`) || "";
  const [walletAddress, setWalletAddress] =
    useState<string>(storedWalletAddress);

  // Sync internal action with query action when query action changes
  useEffect(() => {
    if (queryAction && !internalAction) {
      setInternalAction(queryAction);
    }
  }, [queryAction, internalAction]);

  // Local state
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [manuallyClosedDrawer, setManuallyClosedDrawer] = useState(false);
  const [anonymousWalletAddress, setAnonymousWalletAddress] =
    useState<string>(storedWalletAddress);

  // Use confirmation hook for all confirmation-related methods
  const { handleSuccessContinue, handleConfirmTransaction, onCashierError } =
    useUseConfirmation({
      linkId: linkId ?? "",
      link: link!,
      internalAction,
      setInternalAction,
      anonymousWalletAddress,
      identity,
      refetchLinkUserStateFn,
      linkDetailQuery,
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
    if (link && identity) {
      handleStateBasedNavigation(linkUserState, true);
    }
  }, [link, linkUserState, identity, handleStateBasedNavigation]);

  // Show confirmation drawer when action is available
  useEffect(() => {
    if (internalAction && !manuallyClosedDrawer) {
      setShowConfirmation(true);
    }
  }, [internalAction, link, manuallyClosedDrawer]);

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
    if (internalAction) {
      return internalAction;
    }

    const newAction = await createAction({
      linkId: linkId!,
      actionType: ACTION_TYPE.USE,
    });

    setInternalAction(newAction);
    return newAction;
  };

  /**
   * Creates an action for anonymous users
   */
  const handleCreateActionAnonymous = async (
    walletAddress: string
  ): Promise<ActionModel> => {
    const newAction = await createActionAnonymous({
      linkId: linkId!,
      walletAddress: walletAddress,
      actionType: ACTION_TYPE.USE,
    });

    setInternalAction(newAction);
    return newAction;
  };

  /**
   * Initiates the process of using a link
   */
  const initiateUseLinkAction = async (providedWalletAddress?: string) => {
    // Don't proceed if initial data is still loading
    if (isUserStateLoading || !link) {
      return;
    }

    // Use provided address or the one already stored
    const addressToUse = providedWalletAddress || anonymousWalletAddress;

    if (!identity && !addressToUse) {
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

      if (internalAction) {
        setShowConfirmation(true);
      } else if (identity) {
        // Authenticated user flow
        const action = await handleCreateActionForUser();
        if (action) {
          await refetchLinkUserStateFn();
          setShowConfirmation(true);
        }
      } else if (addressToUse) {
        // Anonymous user flow
        const anonymousLinkUserState = await fetchLinkUserState(
          {
            action_type: ACTION_TYPE.USE,
            link_id: linkId ?? "",
            anonymous_wallet_address: addressToUse,
          },
          identity
        );

        if (!anonymousLinkUserState) {
          toast.error(t("link_detail.error.use_without_login_or_wallet"));
          return;
        }

        if (!anonymousLinkUserState.link_user_state) {
          await handleCreateActionAnonymous(addressToUse);
          setAnonymousWalletAddress(addressToUse);
          await fetchLinkUserState(
            {
              action_type: ACTION_TYPE.USE,
              link_id: linkId ?? "",
              anonymous_wallet_address: addressToUse,
            },
            identity
          );
          setShowConfirmation(true);
        } else if (
          anonymousLinkUserState.link_user_state === LINK_USER_STATE.COMPLETE
        ) {
          goToComplete();
        } else {
          setAnonymousWalletAddress(addressToUse);
          await refetchLinkUserStateFn();
          setShowConfirmation(true);
        }
      } else {
        toast.error(t("link_detail.error.use_without_login_or_wallet"));
      }
    } catch (error) {
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

  const handleWalletConnected = (address?: string) => {
    if (address && address.length > 0) {
      setWalletAddress(address);
      setAnonymousWalletAddress(address);
      // Update sessionStorage
      sessionStorage.setItem(`wallet-address-${linkId}`, address);
    } else if (address === "") {
      // Handle disconnection
      setWalletAddress("");
      setAnonymousWalletAddress("");
      // Clear sessionStorage
      sessionStorage.removeItem(`wallet-address-${linkId}`);
    }
    setShowWalletModal(false);
  };

  const memoizedOnBack = useMemo(
    () => () => {
      goToLinkDefault();
    },
    [goToLinkDefault]
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
                walletAddress={walletAddress}
                onOpenWalletModal={handleOpenWalletModal}
              />
            </div>

            <WalletSelectionModal
              open={showWalletModal}
              onOpenChange={setShowWalletModal}
              onWalletConnected={handleWalletConnected}
              allowChangeWallet={true}
            />

            <FeeInfoDrawer open={showInfo} onClose={() => setShowInfo(false)} />

            <ConfirmationDrawerV2
              open={showConfirmation && !showInfo}
              link={link!}
              action={internalAction}
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
