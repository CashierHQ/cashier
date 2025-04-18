import ClaimPageForm from "@/components/claim-page/claim-page-form";
import { useMultiStepFormContext } from "@/contexts/multistep-form-context";
import { LinkDetailModel } from "@/services/types/link.service.types";
import { FC, useState } from "react";
import { UseFormReturn } from "react-hook-form";
import { ClaimSchema } from ".";
import { z } from "zod";
import {
    fetchLinkUserState,
    useLinkUserState,
    useUpdateLinkUserState,
} from "@/hooks/linkUserHooks";
import { ACTION_TYPE, LINK_USER_STATE } from "@/services/types/enum";
import { useParams } from "react-router-dom";
import { useIdentity } from "@nfid/identitykit/react";
import { ConfirmationDrawer } from "@/components/confirmation-drawer/confirmation-drawer";
import { FeeInfoDrawer } from "@/components/fee-info-drawer/fee-info-drawer";
import { ActionModel } from "@/services/types/action.service.types";
import { useCreateAction, useCreateActionAnonymous } from "@/hooks/linkHooks";
import { isCashierError } from "@/services/errorProcess.service";
import { useLinkActionStore } from "@/stores/linkActionStore";
import { useTranslation } from "react-i18next";

type ClaimFormPageProps = {
    form: UseFormReturn<z.infer<typeof ClaimSchema>>;
    onSubmit: () => void;
    linkData?: LinkDetailModel;
    onCashierError?: (error: Error) => void;
    onActionResult?: (action: ActionModel) => void;
    onBack?: () => void;
};

export const ClaimFormPage: FC<ClaimFormPageProps> = ({
    form,
    linkData,
    onCashierError = () => {},
    onActionResult,
    onSubmit,
    onBack,
}) => {
    const { linkId } = useParams();
    const identity = useIdentity();
    const { t } = useTranslation();
    const { nextStep } = useMultiStepFormContext();
    const [showConfirmation, setShowConfirmation] = useState(false);
    const [showInfo, setShowInfo] = useState(false);
    const { mutateAsync: createAction } = useCreateAction(ACTION_TYPE.CLAIM_LINK);
    const { mutateAsync: createActionAnonymous } = useCreateActionAnonymous(ACTION_TYPE.CLAIM_LINK);
    const { action, anonymousWalletAddress, setAction, setAnonymousWalletAddress } =
        useLinkActionStore();
    const [isDisabledButton, setIsDisabledButton] = useState(true);
    const [buttonText, setButtonText] = useState(t("claim.claim"));

    const updateLinkUserState = useUpdateLinkUserState();

    const { data: linkUserState } = useLinkUserState(
        {
            action_type: ACTION_TYPE.CLAIM_LINK,
            link_id: linkId ?? "",
            anonymous_wallet_address: form.getValues("address") ?? "",
        },
        !!linkId && !!identity && !!form.getValues("address"),
    );

    const handleCreateAction = async (): Promise<ActionModel> => {
        if (linkUserState?.action) {
            return linkUserState.action;
        }

        const updatedAction = await createAction({
            linkId: linkId!,
        });
        return updatedAction;
    };

    const handleCreateActionAnonymous = async (walletAddress: string): Promise<ActionModel> => {
        const linkUserAction = await createActionAnonymous({
            linkId: linkId!,
            walletAddress: walletAddress,
        });
        return linkUserAction;
    };

    const handleSubmit = async (anonymousWalletAddress: string = "") => {
        // Validation
        onSubmit();
        try {
            setIsDisabledButton(true);
            setButtonText(t("processing"));

            if (action) {
                // Display the confirmation drawer
                setShowConfirmation(true);
            } else {
                if (identity) {
                    // Logged in user
                    const action = await handleCreateAction();
                    if (action) {
                        setAction(action);
                        setShowConfirmation(true);
                    }
                } else {
                    // Anonymous user
                    // Fetch user link state
                    const anonymousLinkUserState = await fetchLinkUserState(
                        {
                            action_type: ACTION_TYPE.CLAIM_LINK,
                            link_id: linkId ?? "",
                            anonymous_wallet_address: anonymousWalletAddress,
                        },
                        identity,
                    );
                    if (!anonymousLinkUserState.link_user_state) {
                        // If action is not exist, then create new one
                        const anonymousAction =
                            await handleCreateActionAnonymous(anonymousWalletAddress);
                        setAction(anonymousAction);
                        setAnonymousWalletAddress(anonymousWalletAddress);
                        setShowConfirmation(true);
                    } else {
                        // If action is already existed, then do redirect based on link_user_state
                        if (anonymousLinkUserState.link_user_state === LINK_USER_STATE.COMPLETE) {
                            nextStep();
                        } else {
                            setAction(anonymousLinkUserState.action);
                            setAnonymousWalletAddress(anonymousWalletAddress);
                            setShowConfirmation(true);
                        }
                    }
                }
            }
        } catch (error) {
            if (isCashierError(error)) {
                onCashierError(error);
            }
            console.log("🚀 ~ handleSubmit ~ error:", error);
        } finally {
            setIsDisabledButton(false);
            setButtonText(t("claim.claim"));
        }
    };

    const handleUpdateLinkUserState = async () => {
        const result = await updateLinkUserState.mutateAsync({
            input: {
                action_type: ACTION_TYPE.CLAIM_LINK,
                link_id: linkId ?? "",
                isContinue: true,
                anonymous_wallet_address: anonymousWalletAddress,
            },
        });
        if (result.link_user_state === LINK_USER_STATE.COMPLETE) {
            nextStep();
        }
    };

    return (
        <>
            <div className="w-full h-full flex flex-grow flex-col">
                <ClaimPageForm
                    form={form}
                    formData={linkData ?? ({} as LinkDetailModel)}
                    onSubmit={handleSubmit}
                    onBack={onBack}
                    isDisabled={isDisabledButton}
                    setDisabled={setIsDisabledButton}
                    buttonText={buttonText}
                />
            </div>

            <FeeInfoDrawer open={showInfo} onClose={() => setShowInfo(false)} />

            <ConfirmationDrawer
                open={showConfirmation && !showInfo}
                onClose={() => setShowConfirmation(false)}
                onInfoClick={() => setShowInfo(true)}
                onActionResult={onActionResult}
                onCashierError={onCashierError}
                onSuccessContinue={handleUpdateLinkUserState}
            />
        </>
    );
};
