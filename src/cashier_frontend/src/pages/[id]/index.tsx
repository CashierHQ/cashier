import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import LinkCardWithoutPhoneFrame from "@/components/link-card-without-phone-frame";
import TransactionToast from "@/components/transaction/transaction-toast";
import { ACTION_STATE, ACTION_TYPE, LINK_STATE, LINK_USER_STATE } from "@/services/types/enum";
import useToast from "@/hooks/useToast";
import Header from "@/components/header";
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
import { useLinkAction } from "@/hooks/linkActionHook";
import { useTokens } from "@/hooks/useTokens";

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
    const { renderSkeleton } = useSkeletonLoading();
    const identity = useIdentity();
    const { t } = useTranslation();
    const [showDefaultPage, setShowDefaultPage] = useState(true);

    const { isLoading: isLoadingToken } = useTokens();

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

    useEffect(() => {
        if (linkData && identity) {
            setEnableFetchLinkUserState(true);
        }
        if (linkData) {
            setLink(linkData);
        }
        if (linkData && linkUserState?.link_user_state) {
            setShowDefaultPage(false);
        }

        console.log("🚀 ~ linkData:", linkData);
    }, [linkData, identity]);

    useEffect(() => {
        if (linkId) {
            getLinkDetail();
        }
    }, []);

    if (linkData?.state === LINK_STATE.INACTIVE || linkData?.state === LINK_STATE.INACTIVE_ENDED) {
        return <LinkNotFound />;
    }

    return (
        <div className="w-screen min-h-screen md:min-h-screen flex flex-col items-center overflow-hidden py-5">
            <SheetWrapper>
                <div className="w-11/12 items-center max-w-[400px] h-full flex flex-col flex-1">
                    <Header />
                    {isLoadingLinkData || isLoadingToken ? (
                        renderSkeleton()
                    ) : (
                        <div className="flex flex-col flex-grow w-full h-full sm:max-w-[400px] md:max-w-[100%] my-3">
                            {(!identity || !linkUserState?.link_user_state) &&
                            linkData &&
                            showDefaultPage ? (
                                <LinkCardPage
                                    linkData={linkData}
                                    onClickClaim={() => setShowDefaultPage(false)}
                                />
                            ) : (
                                <MultiStepForm
                                    initialStep={getInitialStep(linkUserState?.link_user_state)}
                                >
                                    <MultiStepForm.Header
                                        showIndicator={false}
                                        showHeader={false}
                                    />
                                    <MultiStepForm.Items>
                                        <MultiStepForm.Item name="Choose wallet">
                                            <ClaimFormPage
                                                form={form}
                                                onSubmit={handleClaim}
                                                linkData={linkData}
                                                onActionResult={showActionResultToast}
                                                onCashierError={showCashierErrorToast}
                                                onBack={() => setShowDefaultPage(true)}
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
                </div>

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
        </div>
    );
}
