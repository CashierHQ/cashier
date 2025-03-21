import ClaimPageForm, { ClaimLinkDetail } from "@/components/claim-page/claim-page-form";
import { useMultiStepFormContext } from "@/contexts/multistep-form-context";
import { LinkDetailModel, LinkModel } from "@/services/types/link.service.types";
import { FC, useEffect, useState } from "react";
import { UseFormReturn } from "react-hook-form";
import { ClaimSchema } from ".";
import { z } from "zod";
import { useLinkUserState, useUpdateLinkUserState } from "@/hooks/linkUserHooks";
import {
    ACTION_STATE,
    ACTION_TYPE,
    CHAIN,
    INTENT_STATE,
    INTENT_TYPE,
    LINK_USER_STATE,
    TASK,
} from "@/services/types/enum";
import { useParams } from "react-router-dom";
import { useIdentity } from "@nfid/identitykit/react";
import { ConfirmationDrawer } from "@/components/confirmation-drawer/confirmation-drawer";
import { FeeInfoDrawer } from "@/components/fee-info-drawer/fee-info-drawer";
import { ActionModel } from "@/services/types/action.service.types";
import { useCreateAction } from "@/hooks/linkHooks";
import { isCashierError } from "@/services/errorProcess.service";
import { useCreateLinkStore } from "@/stores/createLinkStore";

type ClaimFormPageProps = {
    form: UseFormReturn<z.infer<typeof ClaimSchema>>;
    claimLinkDetails: ClaimLinkDetail;
    onSubmit: () => void;
    linkData?: LinkModel;
    onCashierError?: (error: Error) => void;
    onActionResult?: (action: ActionModel) => void;
};

export const ClaimFormPage: FC<ClaimFormPageProps> = ({
    form,
    claimLinkDetails,
    linkData,
    onCashierError = () => {},
    onActionResult,
    onSubmit,
}) => {
    const { linkId } = useParams();
    const identity = useIdentity();
    const { prevStep, nextStep } = useMultiStepFormContext();
    const [enableFetch, setEnableFetch] = useState(false);
    const [showConfirmation, setShowConfirmation] = useState(false);
    const [showInfo, setShowInfo] = useState(false);
    const { mutateAsync: createAction } = useCreateAction();
    const { action, setAction } = useCreateLinkStore();

    const updateLinkUserState = useUpdateLinkUserState();

    useEffect(() => {
        if (linkId && identity) {
            setEnableFetch(true);
        }
    }, [linkId, identity]);

    const { data: linkUserState, isFetching: isFetchingLinkUserState } = useLinkUserState(
        {
            action_type: ACTION_TYPE.CLAIM_LINK,
            link_id: linkId ?? "",
            create_if_not_exist: true,
            anonymous_wallet_address: "",
        },
        enableFetch,
    );

    const handleCreateAction = async () => {
        // const updatedAction = await createAction({
        //     linkId: linkId!,
        // });
        const mockAction = {
            id: "action_id",
            state: ACTION_STATE.SUCCESS,
            creator: "",
            intents: [
                {
                    id: "1",
                    state: INTENT_STATE.SUCCESS,
                    asset: {
                        address: "ryjl3-tyaaa-aaaaa-aaaba-cai",
                        chain: "IC",
                    },
                    chain: CHAIN.IC,
                    task: TASK.TRANSFER_LINK_TO_WALLET,
                    amount: BigInt(1000000000),
                    createdAt: new Date(),
                    from: {
                        address: "ryjl3-tyaaa-aaaaa-aaaba-cai",
                        chain: "IC",
                    },
                    to: {
                        address: "ryjl3-tyaaa-aaaaa-aaaba-cai",
                        chain: "IC",
                    },
                    type: INTENT_TYPE.TRANSFER,
                },
            ],
            type: ACTION_TYPE.CLAIM_LINK,
            icrc112Requests: [],
        };
        setAction(mockAction);
    };

    const handleSubmit = async () => {
        try {
            if (!action) {
                await handleCreateAction();
                setShowConfirmation(true);
            }
        } catch (error) {
            if (isCashierError(error)) {
                onCashierError(error);
            }

            console.log("🚀 ~ handleSubmit ~ error:", error);
        }
    };

    const handleUpdateLinkUserState = async () => {
        const result = await updateLinkUserState.mutateAsync({
            input: {
                action_type: ACTION_TYPE.CLAIM_LINK,
                link_id: linkId ?? "",
                isContinue: true,
                anonymous_wallet_address: "",
            },
        });
        if (result.link_user_state === LINK_USER_STATE.COMPLETE) {
            nextStep();
        }
    };

    // Create link user state if not exist when logged in user land on this page
    useEffect(() => {
        if (!linkUserState && identity) {
            console.log("Creating link user state");
        }
    }, [linkUserState, identity]);

    return (
        <>
            <ClaimPageForm
                form={form}
                formData={linkData?.link ?? ({} as LinkDetailModel)}
                claimLinkDetails={[
                    {
                        title: claimLinkDetails.title,
                        amount: claimLinkDetails.amount,
                    },
                ]}
                onSubmit={onSubmit}
                onBack={prevStep}
            />

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
