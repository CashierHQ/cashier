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
import LinkTemplate from "./LinkTemplate";
import LinkDetails from "./LinkDetails";
import { useNavigate, useParams, useLocation } from "react-router-dom";
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
import { ActionModel } from "@/services/types/action.service.types";
import { getCashierError } from "@/services/errorProcess.service";
import { useLinkCreationFormStore, UserInputItem } from "@/stores/linkCreationFormStore";
import { useLinkAction } from "@/hooks/useLinkAction";
import { MainAppLayout } from "@/components/ui/main-app-layout";

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
    const { toastData, showToast, hideToast } = useToast();

    // Parse URL search parameters to get oldId if present
    const searchParams = new URLSearchParams(location.search);
    const oldIdParam = searchParams.get("oldId");

    const [backButtonDisabled, setBackButtonDisabled] = useState(false);

    const { addUserInput, getUserInput, resetButtonState } = useLinkCreationFormStore();
    const { link, action, callLinkStateMachine, isLoading } = useLinkAction(
        linkId,
        ACTION_TYPE.CREATE_LINK,
    );

    // Get user input data, prioritizing from the oldIdParam if present
    const userInputData = oldIdParam
        ? getUserInput(oldIdParam)
        : linkId
          ? getUserInput(linkId)
          : undefined;

    useEffect(() => {
        // Reset button state when component mounts
        resetButtonState();

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
                if (!input) throw new Error("Input not found");

                if (!linkId) throw new Error("Link ID not found");

                if (!link || !link.state) throw new Error("Link not found");

                if (link.state === LINK_STATE.CREATE_LINK) {
                    navigate("/");
                } else {
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
                    if (stepIndex === undefined) {
                        throw new Error("Step index not found");
                    }
                    context.setStep(stepIndex);
                }
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
    const shouldShowContent = !isLoading || userInputData !== undefined;

    return (
        <MainAppLayout>
            <div className="w-full h-full flex flex-col relative overflow-hidden">
                {isLoading && !userInputData && (
                    <div className="w-screen h-screen flex items-center justify-center">
                        <Spinner />
                    </div>
                )}

                {shouldShowContent && (
                    <>
                        <MultiStepForm initialStep={getInitialStep()}>
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

                            <MultiStepForm.Footer />
                        </MultiStepForm>

                        <TransactionToast
                            open={toastData?.open ?? false}
                            onOpenChange={hideToast}
                            title={toastData?.title ?? ""}
                            description={toastData?.description ?? ""}
                            variant={toastData?.variant ?? "default"}
                        />
                    </>
                )}
            </div>
        </MainAppLayout>
    );
}
