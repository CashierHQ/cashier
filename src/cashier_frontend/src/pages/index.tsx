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

import { useAuth, useIdentity } from "@nfid/identitykit/react";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { LINK_STATE, LINK_TYPE } from "@/services/types/enum";
import useToast from "@/hooks/useToast";
import { headerWalletOptions } from "@/constants/wallet-options";
import { useConnectToWallet } from "@/hooks/user-hook";
import { useLinkCreationFormStore } from "@/stores/linkCreationFormStore";
import { MainAppLayout } from "@/components/ui/main-app-layout";
import { useTokens } from "@/hooks/useTokens";
import LinkLocalStorageService from "@/services/link/link-local-storage.service";
import { useLinksListQuery } from "@/hooks/link-hooks";
import { useLinkAction } from "@/hooks/link-action-hooks";
import { AuthenticatedContent, UnauthenticatedContent } from "@/components/main-page";

export default function HomePage() {
    const { t } = useTranslation();
    const identity = useIdentity();
    const { userInputs, addUserInput } = useLinkCreationFormStore();
    const { user: walletUser } = useAuth();
    const { connectToWallet } = useConnectToWallet();
    const { data: linkData, isLoading: isLinksLoading, refetch } = useLinksListQuery();
    const { link, action, setAction, setLink } = useLinkAction();

    const [showGuide, setShowGuide] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [disableCreateButton, setDisableCreateButton] = useState(false);
    const { showToast } = useToast();
    const navigate = useNavigate();

    const { updateTokenInit } = useTokens();
    const { resetLinkAndAction } = useLinkAction();

    const handleCreateLink = async () => {
        if (!identity) {
            showToast(t("common.error"), t("common.commonErrorMessage"), "error");
            return;
        }
        try {
            setDisableCreateButton(true);
            const creator = identity.getPrincipal().toString();

            console.log("create link with identity: ", creator);

            //! mirror create local storage
            const linkId = new LinkLocalStorageService(creator).createLink();

            addUserInput(linkId, {
                linkId: linkId,
                state: LINK_STATE.CHOOSE_TEMPLATE,
                title: "",
                linkType: LINK_TYPE.SEND_TIP,
                assets: [],
            });

            if (action) {
                setAction(undefined);
            }

            if (link) {
                setLink(undefined);
            }

            navigate(`/edit/${linkId}`);
        } catch {
            showToast(t("common.error"), t("common.commonErrorMessage"), "error");
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
        if (identity) {
            updateTokenInit();
        }
    }, [identity]);

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
                    resetLinkAndAction={resetLinkAndAction}
                />
            )}
        </MainAppLayout>
    );
}
