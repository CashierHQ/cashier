import { useEffect, useState } from "react";
import LinkTemplate from "./LinkTemplate";
import LinkDetails from "./LinkDetails";
import { useNavigate, useParams } from "react-router-dom";
import { MultiStepForm } from "@/components/multi-step-form";
import { useTranslation } from "react-i18next";
import LinkPreview from "./LinkPreview";
import TransactionToast from "@/components/transaction/transaction-toast";
import {
    ACTION_STATE,
    ACTION_TYPE,
    LINK_STATE,
    mapStringToLinkState,
    mapStringToLinkType,
} from "@/services/types/enum";
import useToast from "@/hooks/useToast";
import { Spinner } from "@/components/ui/spinner";
import { MultiStepFormContext } from "@/contexts/multistep-form-context";
import { cn } from "@/lib/utils";
import { ActionModel } from "@/services/types/action.service.types";
import { getCashierError } from "@/services/errorProcess.service";
import { useLinkCreationFormStore, UserInputItem } from "@/stores/linkCreationFormStore";
import { useLinkAction } from "@/hooks/link-action-hooks";

const STEP_LINK_STATE_ORDER = [
    LINK_STATE.CHOOSE_TEMPLATE,
    LINK_STATE.ADD_ASSET,
    LINK_STATE.CREATE_LINK,
];

function getInitialStep(state: string | undefined) {
    const res = STEP_LINK_STATE_ORDER.findIndex((x) => x === state);
    return res;
}

export function stateToStepIndex(state: string | undefined) {
    const res = STEP_LINK_STATE_ORDER.findIndex((x) => x === state);
    return res;
}

export default function LinkPage() {
    const navigate = useNavigate();
    const { t } = useTranslation();
    const { linkId } = useParams();
    const { toastData, showToast, hideToast } = useToast();

    const [backButtonDisabled, setBackButtonDisabled] = useState(false);

    const { addUserInput, getUserInput } = useLinkCreationFormStore();
    const { link, action, callLinkStateMachine, isLoading } = useLinkAction(
        linkId,
        ACTION_TYPE.CREATE_LINK,
    );

    useEffect(() => {
        if (link) {
            const userInput: Partial<UserInputItem> = {
                linkId: link.id,
                state: mapStringToLinkState(link.state!),
                title: link.title,
                linkType: mapStringToLinkType(link.linkType),
                assets: link.asset_info.map((asset) => ({
                    address: asset.address,
                    linkUseAmount: asset.amountPerUse,
                    usdEquivalent: 0,
                    usdConversionRate: 0,
                    chain: asset.chain!,
                    label: asset.label!,
                })),
            };

            addUserInput(link.id, userInput);
        }
    }, [link]);

    const handleBackstep = async (context: MultiStepFormContext) => {
        setBackButtonDisabled(true);
        if (context.step === 0 || action) {
            navigate("/");
        } else {
            try {
                // Update the link state on the server with current values
                const input = getUserInput(linkId!);
                console.log("🚀 ~ input:", input);
                if (!input) throw new Error("Input not found");

                if (!linkId) throw new Error("Link ID not found");

                if (!link || !link.state) throw new Error("Link not found");

                const res = await callLinkStateMachine({
                    linkId: linkId,
                    linkModel: {
                        ...input,
                        // TODO: remove this, not using 1 as default
                        maxActionNumber: BigInt(1),
                    },
                    isContinue: false,
                });

                const currentState = res.state;

                const stepIndex = stateToStepIndex(currentState);
                context.setStep(stepIndex);
            } catch (e) {
                console.error(e);
                showToast(
                    t("transaction.validation.action_failed"),
                    t("transaction.validation.action_failed_message"),
                    "error",
                );
            } finally {
                setBackButtonDisabled(false);
            }
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
        if (action.state === ACTION_STATE.FAIL) {
            showToast(
                t("transaction.confirm_popup.transaction_failed"),
                t("transaction.confirm_popup.transaction_failed_message"),
                "error",
            );
        } else if (action.state === ACTION_STATE.SUCCESS) {
            showToast(
                t("transaction.confirm_popup.transaction_success"),
                t("transaction.confirm_popup.transaction_success_message"),
                "default",
            );
        }
    };

    if (isLoading || !link || link.id !== linkId) {
        return (
            <div className="w-screen h-screen flex items-center justify-center">
                <Spinner />
            </div>
        );
    }

    return (
        <div
            className={cn(
                "w-screen h-dvh flex flex-col items-center py-3 overflow-hidden",
                "md:h-[90%] md:w-[40%] md:max-w-[600px] md:flex md:flex-col md:items-center md:py-5 mb-2 md:bg-[white] md:rounded-md md:drop-shadow-md",
            )}
        >
            <div className="w-11/12 h-full flex flex-col relative overflow-hidden md:overflow-y-auto">
                <MultiStepForm initialStep={getInitialStep(link.state)}>
                    <MultiStepForm.Header
                        onClickBack={handleBackstep}
                        backButtonDisabled={backButtonDisabled}
                    />

                    <MultiStepForm.Items>
                        <MultiStepForm.Item name={t("create.linkName")}>
                            <LinkTemplate
                                onSelectUnsupportedLinkType={showUnsupportedLinkTypeToast}
                            />
                        </MultiStepForm.Item>

                        <MultiStepForm.Item name={t("create.addAssets")}>
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
