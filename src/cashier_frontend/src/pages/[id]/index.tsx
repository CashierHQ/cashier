import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import LinkCardWithoutPhoneFrame from "@/components/link-card-without-phone-frame";
import ClaimPageForm from "@/components/claim-page/claim-page-form";
import TransactionToast from "@/components/transaction/transaction-toast";
import { ACTION_STATE, ACTION_TYPE, LINK_USER_STATE } from "@/services/types/enum";
import useToast from "@/hooks/useToast";
import Header from "@/components/header";
import useConnectToWallet from "@/hooks/useConnectToWallet";
import SheetWrapper from "@/components/sheet-wrapper";
import useTokenMetadata from "@/hooks/tokenUtilsHooks";
import { TokenUtilService } from "@/services/tokenUtils.service";
import { useLinkDataQuery } from "@/hooks/useLinkDataQuery";
import { useLinkUserState, useUpdateLinkUserState } from "@/hooks/linkUserHooks";
import { useIdentity } from "@nfid/identitykit/react";
import { MultiStepForm } from "@/components/multi-step-form";
import { LinkDetailModel } from "@/services/types/link.service.types";
import { LinkCardPage } from "./LinkCardPage";
import { ClaimFormPage } from "./ClaimFormPage";
import { Spinner } from "@/components/ui/spinner";
import { getCashierError } from "@/services/errorProcess.service";
import { ActionModel } from "@/services/types/action.service.types";
import { useTranslation } from "react-i18next";

export const ClaimSchema = z.object({
    token: z.string().min(5),
    amount: z.coerce.number().min(1),
    address: z.string().optional(),
});

const STEP_LINK_USER_STATE_ORDER = [
    LINK_USER_STATE.NO_STATE,
    LINK_USER_STATE.CHOOSE_WALLET,
    LINK_USER_STATE.COMPLETE,
];

function getInitialStep(state: string | undefined) {
    if (state === undefined) {
        state = LINK_USER_STATE.NO_STATE;
    }
    return STEP_LINK_USER_STATE_ORDER.findIndex((x) => x === state);
}

export default function ClaimPage() {
    const [enableFetchLinkUserState, setEnableFetchLinkUserState] = useState(false);
    const { linkId } = useParams();
    const identity = useIdentity();
    const { t } = useTranslation();

    //const updateLinkUserState = useUpdateLinkUserState();
    const { data: linkData, isFetching: isFetchingLinkData } = useLinkDataQuery(linkId);

    const { data: linkUserState, isFetching: isFetchingLinkUserState } = useLinkUserState(
        {
            action_type: ACTION_TYPE.CLAIM_LINK,
            link_id: linkId ?? "",
            create_if_not_exist: false,
            anonymous_wallet_address: "",
        },
        true,
    );

    const [isLoading, setIsLoading] = useState(true);
    const { toastData, showToast, hideToast } = useToast();
    const { connectToWallet } = useConnectToWallet();

    const form = useForm<z.infer<typeof ClaimSchema>>({
        resolver: zodResolver(ClaimSchema),
    });

    const { metadata } = useTokenMetadata(linkData?.link.asset_info?.[0].address);

    const handleClaim = async () => {
        if (!form.getValues("address") || form.getValues("address")?.length == 0) {
            showToast("Test", "To receive, you need to login or connect your wallet", "error");
            return;
        }
        console.log("Claiming");
    };

    const handleConnectWallet = (e: React.MouseEvent<HTMLButtonElement>) => {
        connectToWallet(e);
        setEnableFetchLinkUserState(true);
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

    // Watch form values to trigger re-render
    const watchedToken = form.watch("token");
    const watchedAmount = form.watch("amount");

    useEffect(() => {
        if (linkData) {
            form.setValue("token", linkData.link.title);
            setIsLoading(false);
        }

        if (linkData && identity) {
            setEnableFetchLinkUserState(true);
        }
    }, [linkData, identity]);

    useEffect(() => {
        if (!metadata) return;
        form.setValue(
            "amount",
            TokenUtilService.getHumanReadableAmountFromMetadata(
                linkData?.link.asset_info?.[0].amount ?? BigInt(0),
                metadata,
            ),
        );
    }, [linkData, metadata]);

    if (isLoading) return null;

    return (
        <div className="w-screen h-screen flex flex-col items-center py-5">
            <SheetWrapper>
                <div className="w-11/12 max-w-[400px]">
                    <Header onConnect={handleConnectWallet} openTestForm={connectToWallet} />
                    {isFetchingLinkData || isFetchingLinkUserState ? (
                        <div className="flex justify-center items-center h-full">
                            <Spinner sizes="32" />
                        </div>
                    ) : (
                        <div className="flex flex-col flex-grow w-full sm:max-w-[400px] md:max-w-[100%] my-3">
                            <MultiStepForm
                                initialStep={getInitialStep(linkUserState?.link_user_state)}
                            >
                                <MultiStepForm.Header showIndicator={false} showHeader={false} />
                                <MultiStepForm.Items>
                                    <MultiStepForm.Item name="Claim">
                                        <LinkCardPage linkData={linkData} />
                                    </MultiStepForm.Item>

                                    <MultiStepForm.Item name="Choose wallet">
                                        <ClaimFormPage
                                            form={form}
                                            claimLinkDetails={{
                                                title: watchedToken ?? "",
                                                amount: watchedAmount ?? 0,
                                            }}
                                            onSubmit={handleClaim}
                                            linkData={linkData}
                                            onActionResult={showActionResultToast}
                                            onCashierError={showCashierErrorToast}
                                        />
                                    </MultiStepForm.Item>

                                    <MultiStepForm.Item name="Complete">
                                        <LinkCardWithoutPhoneFrame
                                            label="Claimed"
                                            src="/icpLogo.png"
                                            message={linkData?.link.description ?? ""}
                                            title={linkData?.link.title ?? ""}
                                            disabled={true}
                                        />
                                    </MultiStepForm.Item>
                                </MultiStepForm.Items>
                            </MultiStepForm>
                        </div>
                    )}
                </div>

                <TransactionToast
                    open={toastData?.open ?? false}
                    onOpenChange={hideToast}
                    title={toastData?.title ?? ""}
                    description={toastData?.description ?? ""}
                    variant={toastData?.variant ?? "default"}
                />
            </SheetWrapper>
        </div>
    );
}
