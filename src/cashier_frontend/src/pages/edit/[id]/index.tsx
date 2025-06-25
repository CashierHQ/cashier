// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

import { useEffect, useState } from "react";
import LinkTemplate from "./LinkTemplate";
import LinkDetails from "./LinkDetails";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { MultiStepForm } from "@/components/multi-step-form";
import { useTranslation } from "react-i18next";
import LinkPreview from "./LinkPreview";
import {
    ACTION_STATE,
    ACTION_TYPE,
    LINK_STATE,
    mapStringToLinkState,
    mapStringToLinkType,
} from "@/services/types/enum";
import { Spinner } from "@/components/ui/spinner";
import { MultiStepFormContext } from "@/contexts/multistep-form-context";
import { ActionModel } from "@/services/types/action.service.types";
import { getCashierError } from "@/services/errorProcess.service";
import { useLinkCreationFormStore, UserInputItem } from "@/stores/linkCreationFormStore";
import { MainAppLayout } from "@/components/ui/main-app-layout";
import { toast } from "sonner";
import { useLinkDetailQuery } from "@/hooks/link-hooks";
import { useLinkMutations } from "@/hooks/useLinkMutations";

export function stateToStepIndex(state: string | undefined): number {
    if (state === LINK_STATE.CHOOSE_TEMPLATE) {
        return 0;
    }

    if (state === LINK_STATE.ADD_ASSET) {
        return 1;
    }

    if (state === LINK_STATE.PREVIEW || state === LINK_STATE.CREATE_LINK) {
        return 2;
    }

    return -1;
}

export default function LinkPage() {
    const navigate = useNavigate();
    const location = useLocation();
    const { t } = useTranslation();
    const { linkId } = useParams();

    // Parse URL search parameters to get oldId if present
    const searchParams = new URLSearchParams(location.search);
    const oldIdParam = searchParams.get("oldId");

    const [backButtonDisabled, setBackButtonDisabled] = useState(false);

    const { addUserInput, getUserInput, resetButtonState } = useLinkCreationFormStore();
    const { callLinkStateMachine, isUpdating } = useLinkMutations();

    // Use currentLinkId instead of paramLinkId to handle URL updates
    const linkDetailQuery = useLinkDetailQuery(linkId, ACTION_TYPE.CREATE_LINK);
    const link = linkDetailQuery.data?.link;
    const action = linkDetailQuery.data?.action;
    const isLoading = linkDetailQuery.isLoading;

    // Navigate to details page if link is in a non-editable state
    useEffect(() => {
        if (
            link?.state &&
            [LINK_STATE.ACTIVE, LINK_STATE.INACTIVE, LINK_STATE.INACTIVE_ENDED].includes(
                link.state as LINK_STATE,
            )
        ) {
            navigate(`/details/${link.id}`);
            return;
        }
    }, [link?.state, link?.id, navigate]);

    // Get user input data, prioritizing from the oldIdParam if present
    const userInputData = oldIdParam
        ? getUserInput(oldIdParam)
        : linkId
          ? getUserInput(linkId)
          : undefined;

    // NOTE: this hook might conflict with LinkPreview step, use it carefully
    useEffect(() => {
        // Reset button state when component mounts
        if (link) {
            // not reset in Preview state, because it handled inside the component
            if (link.state !== LINK_STATE.PREVIEW && link.state !== LINK_STATE.CREATE_LINK) {
                resetButtonState();
            }
        }

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
                maxActionNumber: link.maxActionNumber,
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
                if (!input) throw new Error("Input not found");

                if (!linkId) throw new Error("Link ID not found");

                if (!link || !link.state) throw new Error("Link not found");

                if (link.state === LINK_STATE.CREATE_LINK) {
                    navigate("/");
                } else {
                    const res = await callLinkStateMachine({
                        linkId: linkId,
                        linkModel: input,
                        isContinue: false,
                    });

                    const currentState = res.state;

                    const stepIndex = stateToStepIndex(currentState);
                    if (stepIndex === undefined) {
                        throw new Error("Step index not found");
                    }
                    context.setStep(stepIndex);
                }
            } catch (e) {
                console.error(e);
                toast.error(t("transaction.validation.action_failed"), {
                    description: t("transaction.validation.action_failed_message"),
                });
            } finally {
                setBackButtonDisabled(false);
            }
        }
    };

    // TODO: update toaster to context, so toasts/banners can be triggered inside components
    const showUnsupportedLinkTypeToast = () => {
        toast.error(t("error.link.link_type_unsupported"), {
            description: t("error.link.link_type_unsupported"),
        });
    };

    const showInvalidActionToast = () => {
        toast.error(t("transaction.validation.action_failed"), {
            description: t("transaction.validation.action_failed_message"),
        });
    };

    const showCashierErrorToast = (error: Error) => {
        const cahierError = getCashierError(error);

        toast.error(t("error.transaction.transaction_failed"), {
            description: cahierError.message,
        });
    };

    const showActionResultToast = (action: ActionModel) => {
        if (action.state === ACTION_STATE.FAIL) {
            toast.error(t("transaction.confirm_popup.transaction_failed"), {
                description: t("transaction.confirm_popup.transaction_failed_message"),
            });
        } else if (action.state === ACTION_STATE.SUCCESS) {
            toast.success(t("transaction.confirm_popup.transaction_success"), {
                description: t("transaction.confirm_popup.transaction_success_message"),
            });
        }
    };

    // Determine what step to show based on the best available data
    const getInitialStep = () => {
        // If we have link data, use its state
        if (link?.state) {
            return stateToStepIndex(link.state);
        }

        // If we have user input data (from oldId or current link), use its state
        if (userInputData?.state) {
            return stateToStepIndex(userInputData.state);
        }

        // Default to first step if we can't determine
        return 0;
    };

    // Determine if we should show content based on either having link data or user input data
    const shouldShowContent = !isLoading || userInputData !== undefined || link !== undefined;

    return (
        <MainAppLayout>
            <div className="w-full h-full flex flex-col relative overflow-hidden">
                {isLoading && !userInputData && !link && (
                    <div className="w-screen h-screen flex items-center justify-center">
                        <Spinner />
                    </div>
                )}

                {shouldShowContent && link && (
                    <>
                        <MultiStepForm initialStep={getInitialStep()}>
                            <MultiStepForm.Header
                                onClickBack={handleBackstep}
                                backButtonDisabled={backButtonDisabled}
                            />

                            <MultiStepForm.Items>
                                <MultiStepForm.Item name={t("create.linkName")}>
                                    <LinkTemplate
                                        link={link}
                                        onSelectUnsupportedLinkType={showUnsupportedLinkTypeToast}
                                    />
                                </MultiStepForm.Item>

                                <MultiStepForm.Item
                                    name={t(`create.${link?.linkType}.link_detail_title`)}
                                >
                                    <LinkDetails link={link} isUpdating={isUpdating} />
                                </MultiStepForm.Item>

                                <MultiStepForm.Item name={t("create.linkPreview")}>
                                    <LinkPreview
                                        linkDetailQuery={linkDetailQuery}
                                        onInvalidActon={showInvalidActionToast}
                                        onCashierError={showCashierErrorToast}
                                        onActionResult={showActionResultToast}
                                    />
                                </MultiStepForm.Item>
                            </MultiStepForm.Items>

                            <MultiStepForm.Footer />
                        </MultiStepForm>
                    </>
                )}
            </div>
        </MainAppLayout>
    );
}
