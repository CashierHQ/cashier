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

import { useEffect, useState } from "react";
import { useParams, useLocation } from "react-router-dom";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import LinkCardWithoutPhoneFrame from "@/components/link-card-without-phone-frame";
import { ACTION_STATE, ACTION_TYPE, LINK_STATE } from "@/services/types/enum";
import SheetWrapper from "@/components/sheet-wrapper";
import { useLinkUserState } from "@/hooks/linkUserHooks";
import { DefaultPage } from "./Default";
import { getCashierError } from "@/services/errorProcess.service";
import { ActionModel } from "@/services/types/action.service.types";
import { useTranslation } from "react-i18next";
import { useLinkUseNavigation } from "@/hooks/useLinkNavigation";
import { useSkeletonLoading } from "@/hooks/useSkeletonLoading";
import LinkNotFound from "@/components/link-not-found";
import { useLinkAction } from "@/hooks/useLinkAction";
import { useTokens } from "@/hooks/useTokens";
import { MainAppLayout } from "@/components/ui/main-app-layout";
import {
    getDisplayComponentForLink,
    getHeaderInfoForLink,
    getMessageForLink,
    getTitleForLink,
} from "@/components/page/linkCardPage";
import { toast } from "sonner";
import { ChooseWallet } from "./ChooseWallet";
import { useIdentity } from "@nfid/identitykit/react";

export const ClaimSchema = z.object({
    token: z.string().min(5),
    amount: z.coerce.number().min(1),
    address: z.string().optional(),
});

// No longer using step-based order

export default function ClaimPage() {
    const { linkId } = useParams();
    const location = useLocation();
    const { renderSkeleton } = useSkeletonLoading();
    const { t } = useTranslation();
    const [showDefaultPage, setShowDefaultPage] = useState(true);
    const { goToChooseWallet, handleStateBasedNavigation, goToLinkDefault } =
        useLinkUseNavigation(linkId);

    const { updateTokenInit, getToken } = useTokens();
    const identity = useIdentity();

    // Fetch link data
    const {
        link: linkData,
        isLoading: isLoadingLinkData,
        getLinkDetail,
        refetchLinkDetail,
    } = useLinkAction(linkId, ACTION_TYPE.USE_LINK);

    // Fetch link user state for parent component
    // only if user logged in and linkId is available
    // if not, the ChooseWallet component will handle the state
    const {
        data: linkUserState,
        refetch: refetchLinkUserState,
        isFetching: isUserStateLoading,
    } = useLinkUserState(
        {
            action_type: ACTION_TYPE.USE_LINK,
            link_id: linkId ?? "",
            anonymous_wallet_address: "",
        },
        !!linkId && !!identity, // Enable fetching if we have a link ID
    );

    const form = useForm<z.infer<typeof ClaimSchema>>({
        resolver: zodResolver(ClaimSchema),
    });

    // Fetch link data when linkId changes
    // link data use for check current link state
    useEffect(() => {
        if (linkId && !linkData) {
            getLinkDetail();
        }
    }, [linkId, linkData, getLinkDetail]);

    // Enable linkUserState fetching when link data is available
    useEffect(() => {
        console.log("Link data changed:", linkData);
        if (linkData) {
            updateTokenInit();
        }
    }, [linkData]);

    // Update UI state based on current route
    useEffect(() => {
        if (!linkData) return;

        // Determine the current page based on the pathname
        const currentPath = location.pathname;

        // Set UI based on current route
        if (currentPath.endsWith("/choose-wallet") || currentPath.endsWith("/complete")) {
            setShowDefaultPage(false);
        } else {
            setShowDefaultPage(true);
        }

        // For logged-in users with complete state, redirect to complete page
        handleStateBasedNavigation(linkUserState, !!identity);
    }, [linkData, linkUserState, identity, location.pathname, handleStateBasedNavigation]);

    const showCashierErrorToast = (error: Error) => {
        const cahierError = getCashierError(error);
        toast.error(t("common.error"), {
            description: cahierError.message,
        });
    };

    const onActionResult = (action: ActionModel) => {
        if (action.state === ACTION_STATE.SUCCESS || action.state === ACTION_STATE.FAIL) {
            const linkType = linkData?.linkType;
            if (action.state === ACTION_STATE.SUCCESS) {
                toast.success(t(`claim_page.${linkType}.transaction_success`));
            } else {
                toast.error(t(`claim_page.${linkType}.transaction_fail`));
            }
        }
    };

    const handleClickClaim = () => {
        setShowDefaultPage(false);
        goToChooseWallet();
    };

    if (linkData?.state === LINK_STATE.INACTIVE || linkData?.state === LINK_STATE.INACTIVE_ENDED) {
        return <LinkNotFound />;
    }

    return (
        <MainAppLayout>
            <SheetWrapper>
                {isLoadingLinkData && !linkData ? (
                    renderSkeleton()
                ) : (
                    <div className="flex flex-col flex-grow w-full h-full sm:max-w-[400px] md:max-w-[100%] my-3">
                        {showDefaultPage ? (
                            <DefaultPage
                                linkData={linkData}
                                onClickClaim={handleClickClaim}
                                isUserStateLoading={isUserStateLoading}
                                isLoggedIn={!!identity}
                            />
                        ) : location.pathname.endsWith("/complete") ? (
                            <LinkCardWithoutPhoneFrame
                                label="Claimed"
                                message={getMessageForLink(linkData, getToken, true)}
                                title={getTitleForLink(linkData, getToken)}
                                displayComponent={getDisplayComponentForLink(linkData, getToken)}
                                showHeader={true}
                                headerColor={getHeaderInfoForLink(linkData).headerColor}
                                headerTextColor={getHeaderInfoForLink(linkData).headerTextColor}
                                headerText={getHeaderInfoForLink(linkData).headerText}
                                headerIcon={getHeaderInfoForLink(linkData).headerIcon}
                                disabled={true}
                            />
                        ) : (
                            <ChooseWallet
                                refetchLinkDetail={refetchLinkDetail}
                                form={form}
                                linkData={linkData}
                                refetchLinkUserState={refetchLinkUserState}
                                onActionResult={onActionResult}
                                onCashierError={showCashierErrorToast}
                                onBack={() => {
                                    setShowDefaultPage(true);
                                    goToLinkDefault();
                                }}
                            />
                        )}
                    </div>
                )}
            </SheetWrapper>
        </MainAppLayout>
    );
}
