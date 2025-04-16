import { useEffect, useState } from "react";
import LinkTemplate from "./LinkTemplate";
import LinkDetails from "./LinkDetails";
import { useNavigate, useParams } from "react-router-dom";
import { MultiStepForm } from "@/components/multi-step-form";
import { useTranslation } from "react-i18next";
import LinkPreview from "./LinkPreview";
import { useSetTipLinkDetails, useUpdateLinkSelfContained } from "@/hooks/linkHooks";
import TransactionToast from "@/components/transaction/transaction-toast";
import {
    ACTION_STATE,
    ACTION_TYPE,
    CHAIN,
    LINK_INTENT_LABEL,
    LINK_STATE,
    mapStringToLinkState,
    mapStringToLinkType,
} from "@/services/types/enum";
import useToast from "@/hooks/useToast";
import { useLinkActionStore } from "@/stores/linkActionStore";
import { Spinner } from "@/components/ui/spinner";
import { MultiStepFormContext } from "@/contexts/multistep-form-context";
import { cn } from "@/lib/utils";
import { ActionModel } from "@/services/types/action.service.types";
import { getCashierError } from "@/services/errorProcess.service";
import { useLinkDataQuery } from "@/hooks/useLinkDataQuery";
import { useLinkCreationFormStore, UserInputItem } from "@/stores/linkCreationFormStore";
import { AssetInfoModel, LinkDetailModel, LinkModel } from "@/services/types/link.service.types";

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
    const { t } = useTranslation();
    const { linkId } = useParams();
    const { toastData, showToast, hideToast } = useToast();

    const [backButtonDisabled, setBackButtonDisabled] = useState(false);

    const linkCreationFormStore = useLinkCreationFormStore();

    const { addUserInput } = useLinkCreationFormStore();

    const { link, setLink, action, setAction } = useLinkActionStore();

    const { data: linkData, isFetching: isFetchingLinkData } = useLinkDataQuery(
        linkId,
        ACTION_TYPE.CREATE_LINK,
    );
    const { mutateAsync: updateLink } = useUpdateLinkSelfContained();
    const { mutateAsync: setTipLinkDetails } = useSetTipLinkDetails();

    const currentLink = linkData?.link;

    useEffect(() => {
        if (linkData) {
            console.log("🚀 ~ linkData:", linkData);
            setLink(linkData.link);
            setAction(linkData.action);

            const userInput: Partial<UserInputItem> = {
                linkId: linkData.link.id,
                state: mapStringToLinkState(linkData.link.state!),
                title: linkData.link.title,
                linkType: mapStringToLinkType(linkData.link.linkType),
                assets: linkData.link.asset_info.map((asset) => ({
                    address: asset.address,
                    amount: asset.amount,
                    totalClaim: asset.totalClaim ?? 0n,
                    usdEquivalent: 0,
                    usdConversionRate: 0,
                })),
            };

            addUserInput(linkData.link.id, userInput);
        }
        return () => {
            setLink(undefined);
            setAction(undefined);
        };
    }, [linkData]);

    const handleBackstep = async (context: MultiStepFormContext) => {
        setBackButtonDisabled(true);
        if (context.step === 0 || action) {
            navigate("/");
        } else {
            try {
                // Update the link state on the server with current values
                const linkFromStore = linkCreationFormStore.getUserInput(linkId!);
                if (!linkFromStore) return;

                const linkModel: LinkDetailModel = {
                    ...link!,
                    asset_info: linkFromStore.assets as AssetInfoModel[],
                    state: linkFromStore.state,
                };

                let updatedLink: LinkDetailModel | undefined = undefined;

                if (
                    context.step ===
                    STEP_LINK_STATE_ORDER.findIndex((x) => x === LINK_STATE.ADD_ASSET)
                ) {
                    updatedLink = await setTipLinkDetails({
                        link: {
                            ...link!,
                            state: LINK_STATE.ADD_ASSET,
                        },
                        patch: linkFromStore.assets as AssetInfoModel[],
                        isContinue: false,
                    });

                    setLink(updatedLink);
                } else {
                    updatedLink = await updateLink({
                        linkId: linkId!,
                        linkModel: linkModel,
                        isContinue: false,
                    });
                }

                if (!updatedLink) return;
                console.log("🚀 ~ handleBackstep ~ updatedLink:", updatedLink);
                setLink(updatedLink);

                context.prevStep();
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

    if (isFetchingLinkData) {
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
                <p
                    onClick={() => {
                        console.log("🚀 ~ currentLink:", currentLink);
                        console.log(
                            "🚀 ~ from store: ",
                            linkCreationFormStore.getUserInput(linkId!),
                        );
                    }}
                >
                    Log
                </p>
                <MultiStepForm initialStep={getInitialStep(currentLink?.state)}>
                    <MultiStepForm.Header
                        onClickBack={handleBackstep}
                        backButtonDisabled={backButtonDisabled}
                    />

                    <MultiStepForm.Items>
                        <MultiStepForm.Item name={t("create.chooseLinkType")}>
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
