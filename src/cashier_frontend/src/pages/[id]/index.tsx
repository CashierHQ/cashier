import { useEffect, useState, useRef } from "react";
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
import { ClaimFormPage } from "./ClaimFormPage";
import { getCashierError } from "@/services/errorProcess.service";
import { ActionModel } from "@/services/types/action.service.types";
import { useTranslation } from "react-i18next";
import { IoInformationCircle } from "react-icons/io5";
import { useSkeletonLoading } from "@/hooks/useSkeletonLoading";
import { getTokenImage } from "@/utils";
import LinkNotFound from "@/components/link-not-found";
import { useLinkAction } from "@/hooks/link-action-hooks";
import { useTokens } from "@/hooks/useTokens";
import { MainAppLayout } from "@/components/ui/main-app-layout";

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
    const prevIdentityRef = useRef(identity);
    const { t } = useTranslation();
    const [showDefaultPage, setShowDefaultPage] = useState(true);

    const { updateTokenInit } = useTokens();

    // Fetch link data
    const {
        link: linkData,
        isLoading: isLoadingLinkData,
        setLink,
        getLinkDetail,
    } = useLinkAction(linkId, ACTION_TYPE.CLAIM_LINK);

    // Fetch link user state when user is logged in and there's link data
    const { data: linkUserState } = useLinkUserState(
        {
            action_type: ACTION_TYPE.CLAIM_LINK,
            link_id: linkId ?? "",
            anonymous_wallet_address: "",
        },
        enableFetchLinkUserState,
    );

    const { toastData, showToast, hideToast } = useToast();

    const form = useForm<z.infer<typeof ClaimSchema>>({
        resolver: zodResolver(ClaimSchema),
    });

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

    // Handle identity changes to prevent unnecessary re-renders
    useEffect(() => {
        if (identity !== prevIdentityRef.current) {
            prevIdentityRef.current = identity;
            if (linkData) {
                // Reset state when identity changes but don't cause a page reload
                setEnableFetchLinkUserState(true);
            }
        }
    }, [identity, linkData]);

    useEffect(() => {
        if (linkData) {
            setEnableFetchLinkUserState(true);
        }
        if (linkData) {
            setLink(linkData);
            updateTokenInit();
        }
        if (linkData && linkUserState?.link_user_state) {
            setShowDefaultPage(false);
        }
        // Handle step parameter
        setShowDefaultPage(searchParams.get("step") !== "claim");
    }, [linkData, searchParams, linkUserState]);

    useEffect(() => {
        if (linkId && !linkData) {
            getLinkDetail();
        }
    }, [linkId, linkData]);

    if (linkData?.state === LINK_STATE.INACTIVE || linkData?.state === LINK_STATE.INACTIVE_ENDED) {
        return <LinkNotFound />;
    }

    return (
        <MainAppLayout>
            <SheetWrapper>
                {isLoadingLinkData ? (
                    renderSkeleton()
                ) : (
                    <div className="flex flex-col flex-grow w-full h-full sm:max-w-[400px] md:max-w-[100%] my-3">
                        {(!identity || !linkUserState?.link_user_state) &&
                        linkData &&
                        showDefaultPage ? (
                            <LinkCardPage linkData={linkData} onClickClaim={handleClickClaim} />
                        ) : (
                            <MultiStepForm
                                initialStep={getInitialStep(linkUserState?.link_user_state)}
                            >
                                <MultiStepForm.Header showIndicator={false} showHeader={false} />
                                <MultiStepForm.Items>
                                    <MultiStepForm.Item name="Choose wallet">
                                        <ClaimFormPage
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
                                            src={getTokenImage(
                                                linkData?.asset_info?.[0].address ?? "",
                                            )}
                                            message={linkData?.description ?? ""}
                                            title={linkData?.title ?? ""}
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
