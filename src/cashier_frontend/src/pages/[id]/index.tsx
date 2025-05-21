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
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import LinkCardWithoutPhoneFrame from "@/components/link-card-without-phone-frame";
import TransactionToast from "@/components/transaction/transaction-toast";
import { ACTION_STATE, ACTION_TYPE, LINK_STATE, LINK_USER_STATE } from "@/services/types/enum";
import useToast from "@/hooks/useToast";
import SheetWrapper from "@/components/sheet-wrapper";
import { useLinkUserState } from "@/hooks/linkUserHooks";
import { useIdentity } from "@nfid/identitykit/react";
import { MultiStepForm } from "@/components/multi-step-form";
import { LinkCardPage } from "./LinkCardPage";

import { UseFormPage } from "./UseFormPage";
import { getCashierError } from "@/services/errorProcess.service";
import { ActionModel } from "@/services/types/action.service.types";
import { useTranslation } from "react-i18next";
import { IoInformationCircle } from "react-icons/io5";
import { useSkeletonLoading } from "@/hooks/useSkeletonLoading";
import LinkNotFound from "@/components/link-not-found";
import { useLinkAction } from "@/hooks/useLinkAction";
import { useTokens } from "@/hooks/useTokens";
import { MainAppLayout } from "@/components/ui/main-app-layout";
import {
    getDisplayComponentForLink,
    getHeaderColorsForLink,
    getHeaderInfoForLink,
    getHeaderTextColorForLink,
    getMessageForLink,
    getTitleForLink,
} from "@/components/page/linkCardPage";

export const ClaimSchema = z.object({
    token: z.string().min(5),
    amount: z.coerce.number().min(1),
    address: z.string().optional(),
});

const STEP_LINK_USER_STATE_ORDER = [LINK_USER_STATE.CHOOSE_WALLET, LINK_USER_STATE.COMPLETE];

function getInitialStep(state: string | undefined) {
    if (!state) return 0;
    return STEP_LINK_USER_STATE_ORDER.findIndex((x) => x === state);
}

export default function ClaimPage() {
    const [enableFetchLinkUserState, setEnableFetchLinkUserState] = useState(false);
    const { linkId } = useParams();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { renderSkeleton } = useSkeletonLoading();
    const identity = useIdentity();
    const { t } = useTranslation();
    const [showDefaultPage, setShowDefaultPage] = useState(true);

    const { updateTokenInit, getToken } = useTokens();

    // Fetch link data
    const {
        link: linkData,
        isLoading: isLoadingLinkData,
        getLinkDetail,
    } = useLinkAction(linkId, ACTION_TYPE.USE_LINK);

    // Fetch link user state when user is logged in and there's link data
    const { data: linkUserState } = useLinkUserState(
        {
            action_type: ACTION_TYPE.USE_LINK,
            link_id: linkId ?? "",
            anonymous_wallet_address: "",
        },
        enableFetchLinkUserState,
    );

    const { toastData, showToast, hideToast } = useToast();

    const form = useForm<z.infer<typeof ClaimSchema>>({
        resolver: zodResolver(ClaimSchema),
    });

    // Fetch link data when linkId changes
    useEffect(() => {
        if (linkId && !linkData) {
            getLinkDetail();
        }
    }, [linkId, linkData, getLinkDetail]);

    // Enable linkUserState fetching when link data is available
    useEffect(() => {
        if (linkData) {
            setEnableFetchLinkUserState(true);
            updateTokenInit();
        }
    }, [linkData, updateTokenInit]);

    // Update UI state based on linkUserState and URL params
    useEffect(() => {
        if (!linkData) return;

        // If we have a linkUserState and it's COMPLETE, always show the default page
        if (
            linkUserState?.link_user_state === LINK_USER_STATE.COMPLETE &&
            linkData.maxActionNumber === linkData.useActionCounter
        ) {
            setShowDefaultPage(true);
            return;
        }

        // If we have a step parameter in the URL, check if we should show claim form
        const showClaimForm = searchParams.get("step") === "claim";
        setShowDefaultPage(!showClaimForm);
    }, [linkData, linkUserState, searchParams]);

    const handleClaim = async () => {
        if (!identity && (!form.getValues("address") || form.getValues("address")?.length == 0)) {
            showToast(
                "",
                "To receive, you need to login or connect your wallet",
                "default",
                <IoInformationCircle size={40} color="#36A18B" />,
                true,
            );
            return;
        }
    };

    const showCashierErrorToast = (error: Error) => {
        const cahierError = getCashierError(error);
        showToast(t("transaction.create_intent.action_failed"), cahierError.message, "error");
    };

    const showActionResultToast = (action: ActionModel) => {
        if (action.state === ACTION_STATE.SUCCESS || action.state === ACTION_STATE.FAIL) {
            const toastData = {
                title:
                    action.state === ACTION_STATE.SUCCESS
                        ? t("transaction.confirm_popup.transaction_success")
                        : t("transaction.confirm_popup.transaction_failed"),
                description:
                    action.state === ACTION_STATE.SUCCESS
                        ? t("transaction.confirm_popup.transaction_success_message")
                        : t("transaction.confirm_popup.transaction_failed_message"),
                variant:
                    action.state === ACTION_STATE.SUCCESS
                        ? ("default" as const)
                        : ("error" as const),
            };
            showToast(toastData.title, toastData.description, toastData.variant);
        }
    };

    const handleClickClaim = () => {
        setShowDefaultPage(false);
        navigate(`/${linkId}?step=claim`);
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
                            <LinkCardPage linkData={linkData} onClickClaim={handleClickClaim} />
                        ) : (
                            <MultiStepForm
                                initialStep={getInitialStep(linkUserState?.link_user_state)}
                            >
                                <MultiStepForm.Header showIndicator={false} showHeader={false} />
                                <MultiStepForm.Items>
                                    <MultiStepForm.Item name="Choose wallet">
                                        <UseFormPage
                                            form={form}
                                            onSubmit={handleClaim}
                                            linkData={linkData}
                                            onActionResult={showActionResultToast}
                                            onCashierError={showCashierErrorToast}
                                            onBack={() => {
                                                setShowDefaultPage(true);
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

                <TransactionToast
                    open={toastData?.open ?? false}
                    onOpenChange={hideToast}
                    title={toastData?.title ?? ""}
                    description={toastData?.description ?? ""}
                    variant={toastData?.variant ?? "default"}
                    icon={toastData?.icon}
                    boldText={toastData?.boldText}
                />
            </SheetWrapper>
        </MainAppLayout>
    );
}
