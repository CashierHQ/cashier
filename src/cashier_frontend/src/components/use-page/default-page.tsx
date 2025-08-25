// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

import LinkCardWithoutPhoneFrame from "@/components/link-card-without-phone-frame";
import {
  getDisplayComponentForLink,
  getHeaderInfoForLink,
  getTitleForLink,
} from "@/components/page/linkCardPage";
import { useTokensV2 } from "@/hooks/token/useTokensV2";
import { LinkDetailModel } from "@/services/types/link.service.types";
import { FC, useMemo } from "react";
import { useTranslation } from "react-i18next";

type LinkCardPageProps = {
  linkData?: LinkDetailModel;
  onClickClaim?: () => void;
  isUserStateLoading?: boolean;
  isLoggedIn?: boolean;
  isCompletePage?: boolean;
};

// page for no state or user is not logged in
export const DefaultPage: FC<LinkCardPageProps> = ({
  linkData,
  onClickClaim,
  isUserStateLoading,
  isLoggedIn = false,
  isCompletePage = false,
}) => {
  const { getToken } = useTokensV2();
  const { t } = useTranslation();

  const linkHeaderInfo = getHeaderInfoForLink(linkData);

  // Disable the button if:
  // No linkData is available
  const isButtonDisabled = linkData === undefined || isCompletePage;

  const isDataLoading = isLoggedIn && isUserStateLoading;

  const linkLabel = useMemo(() => {
    if (isCompletePage) {
      return t(`claim_page.${linkData?.linkType}.complete_button`, {
        defaultValue: "Unknown! Need to check link type",
      });
    }

    return t(`claim_page.${linkData?.linkType}.use_link_button`, {
      defaultValue: "Unknown! Need to check link type",
    });
  }, [linkData, isCompletePage]);

  const linkMessage = useMemo(() => {
    if (isCompletePage) {
      return t(`claim_page.${linkData?.linkType}.complete_message`, {
        defaultValue: "Unknown! Need to check link type",
      });
    }

    return t(`claim_page.${linkData?.linkType}.use_link_message`, {
      defaultValue: "Unknown! Need to check link type",
    });
  }, [linkData, isCompletePage]);

  console.log("DefaultPage linkData", linkData);

  return (
    <LinkCardWithoutPhoneFrame
      label={linkLabel}
      displayComponent={getDisplayComponentForLink(
        linkData,
        getToken,
        isDataLoading,
      )}
      message={linkMessage}
      title={getTitleForLink(linkData, getToken)}
      onClaim={onClickClaim}
      isDataLoading={isDataLoading}
      disabled={isButtonDisabled}
      showHeader={true}
      headerText={linkHeaderInfo.headerText}
      headerIcon={linkHeaderInfo.headerIcon}
      headerColor={linkHeaderInfo.headerColor}
      headerTextColor={linkHeaderInfo.headerTextColor}
    />
  );
};
