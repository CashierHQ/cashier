// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

import { useEffect, useMemo, useState } from "react";
import { useParams, useLocation } from "react-router-dom";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
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
import { toast } from "sonner";
import { ChooseWallet } from "./ChooseWallet";
import { useIdentity } from "@nfid/identitykit/react";

export const UseSchema = z.object({
    token: z.string().min(5),
    amount: z.coerce.number().min(1),
    address: z.string().optional(),
});

export default function ClaimPage() {
    // 1. React Router hooks
    const { linkId } = useParams();
    const location = useLocation();

    // 2. State hooks
    const [showDefaultPage, setShowDefaultPage] = useState(true);

    // 3. Translation and UI hooks
    const { t } = useTranslation();
    const { renderSkeleton } = useSkeletonLoading();

    // 4. Authentication and core service hooks
    const identity = useIdentity();
    const { updateTokenInit } = useTokens();
    const { goToChooseWallet, handleStateBasedNavigation, goToLinkDefault } =
        useLinkUseNavigation(linkId);

    // 5. Form hook
    const form = useForm<z.infer<typeof UseSchema>>({
        resolver: zodResolver(UseSchema),
    });

    // 6. Data fetching hooks - these depend on identity and linkId
    const {
        link: linkData,
        isLoading: isLoadingLinkData,
        getLinkDetail,
        refetchLinkDetail,
    } = useLinkAction(linkId, ACTION_TYPE.USE_LINK);

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
        if (currentPath.endsWith("/choose-wallet")) {
            setShowDefaultPage(false);
        } else {
            setShowDefaultPage(true);
        }

        // For logged-in users with complete state, redirect to complete page
        handleStateBasedNavigation(linkUserState, !!identity);
    }, [linkData, linkUserState, identity, location.pathname, handleStateBasedNavigation]);

    // 7. Memoized callbacks
    const showCashierErrorToast = useMemo(
        () => (error: Error) => {
            const cahierError = getCashierError(error);
            toast.error(t("common.error"), {
                description: cahierError.message,
            });
        },
        [t],
    );

    const onActionResult = useMemo(
        () => (action: ActionModel) => {
            if (action.state === ACTION_STATE.SUCCESS || action.state === ACTION_STATE.FAIL) {
                const linkType = linkData?.linkType;
                if (action.state === ACTION_STATE.SUCCESS) {
                    toast.success(t(`claim_page.${linkType}.transaction_success`));
                } else {
                    toast.error(t(`claim_page.${linkType}.transaction_failed`));
                }
            }
        },
        [t, linkData?.linkType],
    );

    const handleClickClaim = useMemo(
        () => () => {
            setShowDefaultPage(false);
            goToChooseWallet();
        },
        [goToChooseWallet],
    );

    const isCompletePage = useMemo(() => {
        return location.pathname.endsWith("/complete");
    }, [location.pathname]);

    // Memoize callbacks
    const memoizedOnBack = useMemo(
        () => () => {
            setShowDefaultPage(true);
            goToLinkDefault();
        },
        [goToLinkDefault],
    );

    // Move the early return condition after all hooks are declared
    if (linkData?.state === LINK_STATE.INACTIVE || linkData?.state === LINK_STATE.INACTIVE_ENDED) {
        return <LinkNotFound />;
    }

    return (
        <MainAppLayout>
            <SheetWrapper>
                {isLoadingLinkData && !linkData ? (
                    renderSkeleton()
                ) : (
                    <div className="flex flex-col flex-grow w-full h-full sm:max-w-[400px] md:max-w-[100%] py-3">
                        {showDefaultPage ? (
                            <DefaultPage
                                linkData={linkData}
                                onClickClaim={handleClickClaim}
                                isUserStateLoading={isUserStateLoading}
                                isLoggedIn={!!identity}
                                isCompletePage={isCompletePage}
                            />
                        ) : (
                            <ChooseWallet
                                refetchLinkDetail={refetchLinkDetail}
                                form={form}
                                linkData={linkData}
                                linkUserState={linkUserState}
                                refetchLinkUserState={refetchLinkUserState}
                                onActionResult={onActionResult}
                                onCashierError={showCashierErrorToast}
                                isFetching={isUserStateLoading}
                                onBack={memoizedOnBack}
                            />
                        )}
                    </div>
                )}
            </SheetWrapper>
        </MainAppLayout>
    );
}
