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
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import LinkCardWithoutPhoneFrame from "@/components/link-card-without-phone-frame";
import { ACTION_STATE, ACTION_TYPE, LINK_STATE, LINK_USER_STATE } from "@/services/types/enum";
import SheetWrapper from "@/components/sheet-wrapper";
import { useLinkUserState } from "@/hooks/linkUserHooks";
import { MultiStepForm } from "@/components/multi-step-form";
import { DefaultPage } from "./Default";
import { getCashierError } from "@/services/errorProcess.service";
import { ActionModel } from "@/services/types/action.service.types";
import { useTranslation } from "react-i18next";
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

const STEP_LINK_USER_STATE_ORDER = [LINK_USER_STATE.CHOOSE_WALLET, LINK_USER_STATE.COMPLETE];

// Get initial step based on route or state
function getInitialStep(state: string | undefined, route?: string) {
    // If route is provided, use it to determine initial step
    if (route) {
        if (route.endsWith("/complete")) return 1; // Complete step
        if (route.endsWith("/choose-wallet")) return 0; // Choose wallet step
    }

    // Fall back to state-based determination
    if (!state) return 0;
    return STEP_LINK_USER_STATE_ORDER.findIndex((x) => x === state);
}

export default function ClaimPage() {
    const { linkId } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const { renderSkeleton } = useSkeletonLoading();
    const { t } = useTranslation();
    const [showDefaultPage, setShowDefaultPage] = useState(true);

    const { updateTokenInit, getToken } = useTokens();
    const identity = useIdentity();

    // Fetch link data
    const {
        link: linkData,
        isLoading: isLoadingLinkData,
        getLinkDetail,
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
        if (linkData) {
            updateTokenInit();
        }
    }, [linkData]);

    // Update UI state based on linkUserState and current route
    useEffect(() => {
        if (!linkData) return;

        // Determine the current page based on the pathname
        const currentPath = location.pathname;
        console.log("Current path:", currentPath);

        // Set UI based on current route
        if (currentPath.endsWith("/choose-wallet") || currentPath.endsWith("/complete")) {
            setShowDefaultPage(false);
        } else {
            setShowDefaultPage(true);
        }

        // Don't navigate if already on the correct path
        if (
            currentPath.endsWith("/complete") &&
            linkUserState?.link_user_state === LINK_USER_STATE.COMPLETE
        ) {
            console.log("Already on /complete with COMPLETE state, no navigation needed");
            return;
        }

        if (
            currentPath.endsWith("/choose-wallet") &&
            linkUserState?.link_user_state === LINK_USER_STATE.CHOOSE_WALLET
        ) {
            console.log("Already on /choose-wallet with CHOOSE_WALLET state, no navigation needed");
            return;
        }

        // Sync routes based on state
        if (
            linkUserState?.link_user_state === LINK_USER_STATE.CHOOSE_WALLET &&
            !currentPath.endsWith("/choose-wallet")
        ) {
            console.log("linkUserState is CHOOSE_WALLET, navigating to choose-wallet");
            navigate(`/${linkId}/choose-wallet`);
        } else if (
            linkUserState?.link_user_state === LINK_USER_STATE.COMPLETE &&
            !currentPath.endsWith("/complete")
        ) {
            console.log("linkUserState is COMPLETE, navigating to complete");
            navigate(`/${linkId}/complete`);
        }
    }, [linkData, linkUserState, location.pathname, navigate, linkId]);

    const showCashierErrorToast = (error: Error) => {
        const cahierError = getCashierError(error);
        toast.error(t("common.error"), {
            description: cahierError.message,
        });
    };

    const showActionResultToast = (action: ActionModel) => {
        if (action.state === ACTION_STATE.SUCCESS || action.state === ACTION_STATE.FAIL) {
            if (action.state === ACTION_STATE.SUCCESS) {
                toast.success(t("transaction.confirm_popup.transaction_success"), {
                    description: t("transaction.confirm_popup.transaction_success_message"),
                });
            } else {
                toast.error(t("transaction.confirm_popup.transaction_failed"), {
                    description: t("transaction.confirm_popup.transaction_failed_message"),
                });
            }
        }
    };

    const handleClickClaim = () => {
        setShowDefaultPage(false);
        navigate(`/${linkId}/choose-wallet`);
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
                        ) : (
                            <MultiStepForm
                                initialStep={getInitialStep(
                                    linkUserState?.link_user_state,
                                    location.pathname,
                                )}
                                key={`form-${location.pathname}`}
                            >
                                {/* This is not the header stick on the page, it be long to the multiple step form*/}
                                <MultiStepForm.Header showIndicator={false} showHeader={false} />
                                <MultiStepForm.Items>
                                    <MultiStepForm.Item name="Choose wallet">
                                        <ChooseWallet
                                            form={form}
                                            linkData={linkData}
                                            refetchLinkUserState={refetchLinkUserState}
                                            onActionResult={showActionResultToast}
                                            onCashierError={showCashierErrorToast}
                                            onBack={() => {
                                                setShowDefaultPage(true);
                                                console.log("onBack called from ChooseWallet");
                                                navigate(`/${linkId}`);
                                            }}
                                        />
                                    </MultiStepForm.Item>

                                    <MultiStepForm.Item name="Complete">
                                        <LinkCardWithoutPhoneFrame
                                            label="Claimed"
                                            message={getMessageForLink(linkData, getToken, true)}
                                            title={getTitleForLink(linkData, getToken)}
                                            displayComponent={getDisplayComponentForLink(
                                                linkData,
                                                getToken,
                                            )}
                                            showHeader={true}
                                            headerColor={getHeaderInfoForLink(linkData).headerColor}
                                            headerTextColor={
                                                getHeaderInfoForLink(linkData).headerTextColor
                                            }
                                            headerText={getHeaderInfoForLink(linkData).headerText}
                                            headerIcon={getHeaderInfoForLink(linkData).headerIcon}
                                            disabled={true}
                                        />
                                    </MultiStepForm.Item>
                                </MultiStepForm.Items>
                            </MultiStepForm>
                        )}
                    </div>
                )}
            </SheetWrapper>
        </MainAppLayout>
    );
}
