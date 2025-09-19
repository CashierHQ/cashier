// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { ACTION_TYPE, LINK_STATE } from "@/services/types/enum";
import SheetWrapper from "@/components/sheet-wrapper";
import { useLinkUserStateQuery } from "@/hooks/linkUserHooks";
import { DefaultPage } from "@/components/use-page/default-page";

import { useLinkUseNavigation } from "@/hooks/useLinkNavigation";
import { useSkeletonLoading } from "@/hooks/useSkeletonLoading";
import LinkNotFound from "@/components/link-not-found";
import { MainAppLayout } from "@/components/ui/main-app-layout";

import { useLinkDetailQuery } from "@/hooks/link-hooks";
import { useTokensV2 } from "@/hooks/token/useTokensV2";
import { WalletSelectionModal } from "@/components/wallet-connect/wallet-selection-modal";
import usePnpStore from "@/stores/plugAndPlayStore";

export default function ClaimPage() {
  const { linkId } = useParams();

  const { renderSkeleton } = useSkeletonLoading();

  const { updateTokenInit } = useTokensV2();
  const { goToChooseWallet, handleStateBasedNavigation } =
    useLinkUseNavigation(linkId);

  // State for wallet selection modal
  const [showWalletModal, setShowWalletModal] = useState(false);

  // Data fetching hooks
  const linkDetailQuery = useLinkDetailQuery(linkId, ACTION_TYPE.USE);
  const linkData = linkDetailQuery.data?.link;
  const isLoadingLinkData = linkDetailQuery.isLoading;
  const { account } = usePnpStore();

  const { data: linkUserState, isFetching: isUserStateLoading } =
    useLinkUserStateQuery(
      {
        action_type: ACTION_TYPE.USE,
        link_id: linkId ?? "",
        anonymous_wallet_address: "",
      },
      !!linkId,
    );

  // Fetch link data when linkId changes
  useEffect(() => {
    if (linkId && !linkData) {
      linkDetailQuery.refetch();
    }
  }, [linkId, linkData]);

  // Enable linkUserState fetching when link data is available
  useEffect(() => {
    if (linkData) {
      updateTokenInit();
    }
  }, []);

  // Handle state-based navigation for logged-in users
  useEffect(() => {
    if (linkData && account) {
      handleStateBasedNavigation(linkUserState, true);
    }
  }, [linkData, linkUserState, account, handleStateBasedNavigation]);

  const handleClickUse = () => {
    if (account) {
      // User is authenticated, go directly to choose-wallet page
      goToChooseWallet();
    } else {
      // User is not authenticated, show wallet selection modal
      setShowWalletModal(true);
    }
  };

  const handleWalletConnected = () => {
    setShowWalletModal(false);
    if (account) {
      goToChooseWallet();
    }
  };

  useEffect(() => {
    console.log("showWalletModal", showWalletModal);
  }, [showWalletModal]);

  // Early return for inactive links
  if (
    linkData?.state === LINK_STATE.INACTIVE ||
    linkData?.state === LINK_STATE.INACTIVE_ENDED
  ) {
    return <LinkNotFound />;
  }

  return (
    <MainAppLayout>
      <SheetWrapper>
        {isLoadingLinkData && !linkData ? (
          renderSkeleton()
        ) : (
          <>
            <div className="flex flex-col flex-grow w-full h-full sm:max-w-[400px] md:max-w-[100%] py-3">
              <DefaultPage
                linkData={linkData}
                onClickUse={handleClickUse}
                isUserStateLoading={isUserStateLoading}
                isLoggedIn={!!account}
                isCompletePage={false}
              />
            </div>

            <WalletSelectionModal
              isWalletModalOpen={showWalletModal}
              onOpenChange={setShowWalletModal}
              onWalletConnected={handleWalletConnected}
            />
          </>
        )}
      </SheetWrapper>
    </MainAppLayout>
  );
}
