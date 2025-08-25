// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

import { useAuth, useIdentity } from "@nfid/identitykit/react";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { LINK_STATE, LINK_TYPE } from "@/services/types/enum";
import { headerWalletOptions } from "@/constants/wallet-options";
import { useConnectToWallet } from "@/hooks/user-hook";
import { useLinkCreationFormStore } from "@/stores/linkCreationFormStore";
import { MainAppLayout } from "@/components/ui/main-app-layout";
import { useLinksListQuery } from "@/hooks/link-hooks";
import {
  AuthenticatedContent,
  UnauthenticatedContent,
} from "@/components/main-page";
import { toast } from "sonner";
import LinkLocalStorageServiceV2 from "@/services/link/link-local-storage.service.v2";

export default function HomePage() {
  const { t } = useTranslation();
  const identity = useIdentity();
  const { userInputs, addUserInput } = useLinkCreationFormStore();
  const { user: walletUser } = useAuth();
  const { connectToWallet } = useConnectToWallet();
  const {
    data: linkData,
    isLoading: isLinksLoading,
    refetch,
  } = useLinksListQuery();

  const [showGuide, setShowGuide] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [disableCreateButton, setDisableCreateButton] = useState(false);
  const navigate = useNavigate();

  const handleCreateLink = async () => {
    if (!identity) {
      toast.error(t("common.error"), {
        description: t("common.commonErrorMessage"),
      });
      return;
    }
    try {
      setDisableCreateButton(true);
      const creator = identity.getPrincipal().toString();

      console.log("create link with identity: ", creator);

      //! mirror create local storage
      const linkId = new LinkLocalStorageServiceV2(creator).createLink();

      addUserInput(linkId, {
        linkId: linkId,
        state: LINK_STATE.CHOOSE_TEMPLATE,
        title: "",
        linkType: LINK_TYPE.SEND_TIP,
        assets: [],
      });

      navigate(`/edit/${linkId}`);
    } catch {
      toast.error(t("common.error"), {
        description: t("common.commonErrorMessage"),
      });
    } finally {
      setDisableCreateButton(false);
    }
  };

  const handleHideGuide = () => {
    setShowGuide(false);
    localStorage.setItem("showGuide", "false");
  };

  useEffect(() => {
    if (localStorage.getItem("showGuide") === "false") {
      setShowGuide(false);
    } else {
      setShowGuide(true);
    }
  }, []);

  useEffect(() => {
    if (identity) {
      refetch();
    }
  }, [identity]);

  useEffect(() => {
    const draftLinkStates = [
      LINK_STATE.ADD_ASSET,
      LINK_STATE.CHOOSE_TEMPLATE,
      LINK_STATE.CREATE_LINK,
    ];
    if (linkData) {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      Object.entries(linkData).forEach(([_date, links]) => {
        links.forEach((link) => {
          if (draftLinkStates.includes(link.state as LINK_STATE)) {
            if (userInputs.has(link.id)) {
              // Convert BigInt values to strings before adding to store
              // Store kept crashing otherwise if using BigInt, maybe
              const processedAssets = link.asset_info
                ? link.asset_info.map((asset) => ({
                    address: asset.address,
                    linkUseAmount: asset.amountPerUse,
                    chain: asset.chain!,
                    label: asset.label!,
                  }))
                : [];

              addUserInput(link.id, {
                linkId: link.id,
                state: link.state as LINK_STATE,
                title: link.title,
                linkType: link.linkType as LINK_TYPE,
                assets: processedAssets,
              });
            }
          }
        });
      });
    }
  }, [linkData]);

  useEffect(() => {
    if (isLinksLoading) {
      setIsLoading(true);
    } else {
      setIsLoading(false);
    }
  }, [isLinksLoading]);

  return (
    <MainAppLayout>
      {!walletUser ? (
        <UnauthenticatedContent
          headerWalletOptions={headerWalletOptions}
          connectToWallet={connectToWallet}
        />
      ) : (
        <AuthenticatedContent
          showGuide={showGuide}
          handleHideGuide={handleHideGuide}
          disableCreateButton={disableCreateButton}
          handleCreateLink={handleCreateLink}
          isLoading={isLoading}
          linkData={linkData}
        />
      )}
    </MainAppLayout>
  );
}
