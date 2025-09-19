// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

import { useEffect, useMemo } from "react";
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
import usePnpStore from "@/stores/plugAndPlayStore";

export default function CompletePage() {
  const { linkId } = useParams();

  const { renderSkeleton } = useSkeletonLoading();

  const { updateTokenInit } = useTokensV2();
  const { handleStateBasedNavigation, goToChooseWallet } =
    useLinkUseNavigation(linkId);

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
      !!linkId && !!account,
    );

  // Initialize tokens when link data is available
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

  const handleClickClaim = useMemo(
    () => () => {
      goToChooseWallet();
    },
    [goToChooseWallet],
  );

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
          <div className="flex flex-col flex-grow w-full h-full sm:max-w-[400px] md:max-w-[100%] py-3">
            <DefaultPage
              linkData={linkData}
              onClickUse={handleClickClaim}
              isUserStateLoading={isUserStateLoading}
              isLoggedIn={!!account}
              isCompletePage={true}
            />
          </div>
        )}
      </SheetWrapper>
    </MainAppLayout>
  );
}
