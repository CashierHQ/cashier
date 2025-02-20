import { useEffect } from "react";
import LinkTemplate from "./LinkTemplate";
import LinkDetails from "./LinkDetails";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import { MultiStepForm } from "@/components/multi-step-form";
import { useTranslation } from "react-i18next";
import LinkPreview from "./LinkPreview";
import { useUpdateLinkSelfContained } from "@/hooks/linkHooks";
import TransactionToast from "@/components/transaction/transaction-toast";
import { ACTION_STATE, LINK_STATE } from "@/services/types/enum";
import useToast from "@/hooks/useToast";
import { useLinkDataQuery } from "@/hooks/useLinkDataQuery";
import { useCreateLinkStore } from "@/stores/createLinkStore";
import { Spinner } from "@/components/ui/spinner";
import { useIdentity } from "@nfid/identitykit/react";
import { MultiStepFormContext } from "@/contexts/multistep-form-context";
import { cn } from "@/lib/utils";
import { ActionModel } from "@/services/types/action.service.types";
import { getCashierError } from "@/services/errorProcess.service";

const STEP_LINK_STATE_ORDER = [
    LINK_STATE.CHOOSE_TEMPLATE,
    LINK_STATE.ADD_ASSET,
    LINK_STATE.CREATE_LINK,
];

function getInitialStep(state: string | undefined) {
    return STEP_LINK_STATE_ORDER.findIndex((x) => x === state);
}

export default function LinkPage() {
    const navigate = useNavigate();
    const identity = useIdentity();

    const { t } = useTranslation();
    const { linkId } = useParams();
    const { toastData, showToast, hideToast } = useToast();

    const { link, setLink, action, setAction } = useCreateLinkStore();

    const { data: linkData, isFetching: isFetchingLinkData } = useLinkDataQuery(linkId);
    const { mutateAsync: updateLink } = useUpdateLinkSelfContained();

    useEffect(() => {
        if (linkData) {
            setLink(linkData.link);
            setAction(linkData.action);
        }

        return () => {
            setLink(undefined);
            setAction(undefined);
        };
    }, [linkData]);

    const handleBackstep = async (context: MultiStepFormContext) => {
        if (context.step === 0 || action) {
            navigate("/");
        } else {
            console.log("trying to step back");
            console.log("link", link);
            console.log("action", action);

            updateLink({
                linkId: linkId!,
                linkModel: link!,
                isContinue: false,
            });
            context.prevStep();
        }
    };

    // TODO: update toaster to context, so toasts/banners can be triggered inside components
    const showUnsupportedLinkTypeToast = () => {
        showToast(
            "Unsupported link type",
            "The current link type is currently not supported now. Please choose another link type.",
            "error",
        );
    };

    const showInvalidActionToast = () => {
        showToast(
            t("transaction.validation.action_failed"),
            t("transaction.validation.action_failed_message"),
            "error",
        );
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

    if (!linkId || !identity) {
        return <Navigate to={"/"} />;
    }

    if (isFetchingLinkData || getInitialStep(link?.state) < 0) {
        return (
            <div className="flex flex-col justify-center items-center w-full h-svh">
                <Spinner width={64} />
            </div>
        );
    }

    return (
        <div
            className={cn(
                "w-screen h-dvh max-h-dvh flex flex-col items-center py-3",
                "md:h-[90%] md:w-[40%] md:flex md:flex-col md:items-center md:py-5 md:bg-[white] md:rounded-md md:drop-shadow-md",
            )}
        >
            <div className="w-11/12 flex flex-col flex-grow sm:max-w-[400px] md:max-w-[100%]">
                <MultiStepForm initialStep={getInitialStep(linkData?.link?.state)}>
                    <MultiStepForm.Header onClickBack={handleBackstep} />

                    <MultiStepForm.Items>
                        <MultiStepForm.Item name={t("create.linkTemplate")}>
                            <LinkTemplate
                                onSelectUnsupportedLinkType={showUnsupportedLinkTypeToast}
                            />
                        </MultiStepForm.Item>

                        <MultiStepForm.Item name={t("create.linkDetails")}>
                            <LinkDetails />
                        </MultiStepForm.Item>

                        <MultiStepForm.Item name={t("create.linkPreview")}>
                            <LinkPreview
                                onInvalidActon={showInvalidActionToast}
                                onCashierError={showCashierErrorToast}
                                onActionResult={showActionResultToast}
                            />
                        </MultiStepForm.Item>
                    </MultiStepForm.Items>
                </MultiStepForm>

                <TransactionToast
                    open={toastData?.open ?? false}
                    onOpenChange={hideToast}
                    title={toastData?.title ?? ""}
                    description={toastData?.description ?? ""}
                    variant={toastData?.variant ?? "default"}
                />
            </div>
        </div>
    );
}
