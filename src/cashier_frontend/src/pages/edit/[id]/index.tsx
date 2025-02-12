import { useEffect, useState } from "react";
import LinkTemplate, { linkTemplateSchema } from "./LinkTemplate";
import LinkDetails, { linkDetailsSchema } from "./LinkDetails";
import { useNavigate, useParams } from "react-router-dom";
import MultiStepForm from "@/components/multi-step-form";
import { useTranslation } from "react-i18next";
import LinkPreview from "./LinkPreview";
import { useIdentity } from "@nfid/identitykit/react";
import LinkService, {
    CreateActionInputModel,
    UpdateActionInputModel,
} from "@/services/link.service";
import { useQueryClient } from "@tanstack/react-query";
import { UpdateLinkParams, useUpdateLink } from "@/hooks/linkHooks";
import { LinkDetailModel, State, Template } from "@/services/types/link.service.types";
import { ConfirmTransactionModel } from "@/components/confirmation-drawer/confirmation-drawer";
import TransactionToast from "@/components/transaction/transaction-toast";
import { useResponsive } from "@/hooks/responsive-hook";
import { getResponsiveClassname } from "@/utils";
import { responsiveMapper } from "./index_responsive";
import { z } from "zod";
import {
    ACTION_STATE,
    ACTION_TYPE,
    INTENT_STATE,
    LINK_STATE,
    LINK_TYPE,
} from "@/services/types/enum";
import { IntentCreateModel, TransactionModel } from "@/services/types/intent.service.types";
import IntentService from "@/services/intent.service";
import SignerService from "@/services/signer.service";
import { Identity } from "@dfinity/agent";
import { toCanisterCallRequest } from "@/services/types/mapper/intent.service.mapper";
import useToast from "@/hooks/useToast";
import { getCashierError } from "@/services/errorProcess.service";
import { ActionModel } from "@/services/types/action.service.types";
import { useLinkDataQuery } from "@/hooks/useLinkDataQuery";
import { LINK_TEMPLATE_DESCRIPTION_MESSAGE } from "@/constants/message";
import { Icrc112RequestModel } from "@/services/types/transaction.service.types";

const STEP_LINK_STATE_ORDER = [
    LINK_STATE.CHOOSE_TEMPLATE,
    LINK_STATE.ADD_ASSET,
    LINK_STATE.CREATE_LINK,
];

export default function LinkPage({ initialStep = 0 }: { initialStep?: number }) {
    const [formData, setFormData] = useState<LinkDetailModel>({
        id: "",
        title: "",
        image: "",
        description: "",
        state: "",
        template: Template.Central,
        create_at: new Date(),
        amount: BigInt(0),
        amountNumber: 0,
        linkType: LINK_TYPE.NFT_CREATE_AND_AIRDROP,
        tokenAddress: "",
    });

    const [isDisabled, setDisabled] = useState(false);
    const [currentStep, setCurrentStep] = useState<number>(initialStep);
    const [isRendering, setRendering] = useState(true);
    const [intentCreate, setIntentCreate] = useState<IntentCreateModel>();
    const [linkAction, setLinkAction] = useState<ActionModel>();
    const [transactionConfirmModel, setTransactionConfirmModel] =
        useState<ConfirmTransactionModel>();
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { linkId } = useParams();
    const identity = useIdentity();
    const responsive = useResponsive();
    const { toastData, showToast, hideToast } = useToast();

    const queryClient = useQueryClient();
    const { data: linkData } = useLinkDataQuery(linkId, ACTION_TYPE.CREATE_LINK, identity);
    const { mutate, error: updateLinkError, mutateAsync } = useUpdateLink(queryClient, identity);

    useEffect(() => {
        if (linkData) {
            const { link, action } = linkData;

            if (link && link.state) {
                const step = STEP_LINK_STATE_ORDER.findIndex((x) => x === link.state);
                setFormData(link);
                setRendering(false);
                setCurrentStep(step >= 0 ? step : 0);
            }

            if (action) {
                setLinkAction(action);
                setTransactionConfirmModel(
                    (prevModel) =>
                        ({
                            ...prevModel,
                            linkData: linkData,
                            action: linkAction,
                            transactions: linkData?.intent_create?.transactions,
                        }) as ConfirmTransactionModel,
                );
            }
        }

        if (linkData?.intent_create?.state === INTENT_STATE.SUCCESS) {
            showToast(
                t("transaction.confirm_popup.transaction_success"),
                t("transaction.confirm_popup.transaction_success_message"),
                "default",
            );
        }

        if (linkData?.intent_create?.state === INTENT_STATE.FAIL) {
            showToast(
                t("transaction.confirm_popup.transaction_failed"),
                t("transaction.validation.transaction_failed_message"),
                "error",
            );
        }
    }, [linkData]);

    const handleSubmitLinkTemplate = async (values: z.infer<typeof linkTemplateSchema>) => {
        if (!linkId) return;
        if (values.linkType !== LINK_TYPE.TIP_LINK) {
            showToast(
                "Unsupported link type",
                "The current link type is currently not supported now. Please choose another link type.",
                "error",
            );
            throw new Error();
        }
        const updateLinkParams: UpdateLinkParams = {
            linkId: linkId,
            linkModel: {
                ...formData,
                title: values.title,
                linkType: values.linkType,
                description: LINK_TEMPLATE_DESCRIPTION_MESSAGE.TIP,
            },
            isContinue: true,
        };
        mutate(updateLinkParams);
        if (updateLinkError) {
            throw updateLinkError;
        }
        setFormData({ ...formData, ...values });
    };

    const handleSubmitLinkDetails = async (values: z.infer<typeof linkDetailsSchema>) => {
        if (!linkId) return;
        try {
            formData.state = State.PendingPreview;
            const updateLinkParams: UpdateLinkParams = {
                linkId: linkId,
                linkModel: {
                    ...formData,
                    ...values,
                    amount: values.amount,
                    description: "test",
                },
                isContinue: true,
            };
            mutate(updateLinkParams);
            setFormData({ ...formData, ...values });
        } catch (error) {
            console.log("🚀 ~ handleSubmitLinkDetails ~ error:", error);
        }
    };

    const handleCreateAction = async (linkService: LinkService) => {
        if (linkAction) {
            const transactionConfirmObj: ConfirmTransactionModel = {
                linkName: formData.title ?? "",
                linkData: linkData!,
                transactions: intentCreate?.transactions,
                action: linkAction,
            };
            setTransactionConfirmModel(transactionConfirmObj);
        } else {
            const input: CreateActionInputModel = {
                linkId: linkId ?? "",
                actionType: ACTION_TYPE.CREATE_LINK,
            };
            const action = await linkService.processAction(input);

            if (action) {
                setLinkAction(action);
                const transactionConfirmObj: ConfirmTransactionModel = {
                    linkName: formData.title ?? "",
                    linkData: linkData!,
                    transactions: intentCreate?.transactions,
                    action: action,
                };
                setTransactionConfirmModel(transactionConfirmObj);
            }
        }
    };

    // User click "Create" button
    const handleSubmit = async () => {
        if (!linkId) return;
        const validationResult = true;
        try {
            if (validationResult) {
                const linkService = new LinkService(identity);

                setDisabled(true);

                await handleCreateAction(linkService);
            } else {
                showToast(
                    t("transaction.validation.action_failed"),
                    t("transaction.validation.action_failed_message"),
                    "error",
                );
            }
        } catch (error) {
            if (error instanceof Error) {
                const cashierError = getCashierError(error);
                showToast(
                    t("transaction.create_intent.action_failed"),
                    cashierError.message,
                    "error",
                );
            }
            console.log("🚀 ~ handleSubmit ~ error:", error);
            setDisabled(false);
        } finally {
            setDisabled(false);
        }
    };

    const callExecute = async (
        transactions: Icrc112RequestModel[][] | undefined,
        identity: Identity | undefined,
    ) => {
        //TOODO: Remove after demo
        console.log("CALLING MOCK EXECUTE ICRC-112");
        if (!identity) return;
        if (!transactions || transactions.length === 0) {
            return;
        }
        try {
            const signerService = new SignerService(identity);
            const res = await signerService.icrcxExecute(transactions);
            return res;
        } catch (err) {
            console.log(err);
        }
    };

    const handleChange = (values: Partial<LinkDetailModel>) => {
        setFormData({ ...formData, ...values });
    };

    const handleUpdateLinkToActive = async () => {
        const updateLinkParams: UpdateLinkParams = {
            linkId: linkId ?? "",
            linkModel: {
                ...formData,
                description: "none",
            },
            isContinue: true,
        };
        await mutateAsync(updateLinkParams);
        navigate(`/details/${linkId}`);
    };

    const startTransaction = async () => {
        const input: CreateActionInputModel = {
            linkId: linkId ?? "",
            actionType: ACTION_TYPE.CREATE_LINK,
            actionId: linkAction?.id,
        };
        const linkService = new LinkService(identity);
        const action = await linkService.processAction(input);
        console.log("🚀 ~ Action response after calling process_action ~ action:", action);
        if (action) {
            setLinkAction(action);
            const transactionConfirmObj: ConfirmTransactionModel = {
                linkName: formData.title ?? "",
                linkData: linkData!,
                transactions: intentCreate?.transactions,
                action: action,
            };
            setTransactionConfirmModel(transactionConfirmObj);
        }

        // Calling execute after process_action
        const icrc112ExecuteRes = await callExecute(action.icrc112Requests, identity);
        console.log("MOCK RESPONSE FROM EXECUTING ICRC-112: ", icrc112ExecuteRes);

        // TODO: Remove after demo
        setTimeout(async () => {
            console.log("CALLING UPDATE ACTION");
            const inputModel: UpdateActionInputModel = {
                actionId: action.id,
                linkId: linkId ?? "",
                external: true,
            };
            const linkService = new LinkService(identity);
            const actionRes = await linkService.updateAction(inputModel);
            if (actionRes) {
                setLinkAction(actionRes);
                const transactionConfirmObj: ConfirmTransactionModel = {
                    linkName: formData.title ?? "",
                    linkData: linkData!,
                    transactions: intentCreate?.transactions,
                    action: actionRes,
                };
                setTransactionConfirmModel(transactionConfirmObj);
                const toastData = {
                    title:
                        actionRes.state === ACTION_STATE.SUCCESS
                            ? t("transaction.confirm_popup.transaction_success")
                            : t("transaction.confirm_popup.transaction_failed"),
                    description:
                        actionRes.state === ACTION_STATE.SUCCESS
                            ? t("transaction.confirm_popup.transaction_success_message")
                            : t("transaction.confirm_popup.transaction_failed_message"),
                    variant:
                        actionRes.state === ACTION_STATE.SUCCESS
                            ? ("default" as const)
                            : ("error" as const),
                };
                showToast(toastData.title, toastData.description, toastData.variant);
            }
            console.log("🚀 ~ Response as Action from update_action: ", actionRes);
        }, 15000);
    };

    // Handle submit action in confirm transaction dialog
    const handleAction = async () => {
        if (!linkId) return;
        try {
            if (linkAction?.state === ACTION_STATE.SUCCESS) {
                console.log("CLICKED SUBMIT BUTTON");
                console.log("UPDATING LINK TO ACTIVE STATE...");
                await handleUpdateLinkToActive();
            } else {
                console.log("CLICKED SUBMIT BUTTON");
                await startTransaction();
            }
        } catch (err) {
            console.error(err);
        }
    };

    const handleBackstep = async () => {
        if (!linkId) {
            return;
        }
        try {
            const updateLinkParams: UpdateLinkParams = {
                linkId: linkId,
                linkModel: {
                    ...formData,
                },
                isContinue: false,
            };

            mutate(updateLinkParams);
        } catch (err) {
            console.log(err);
        }
    };

    if (isRendering) return null;

    return (
        <div
            className={getResponsiveClassname(
                responsive,
                responsiveMapper.find((o) => (o.htmlId = "edit_multistepform_wrapper")),
            )}
            id="edit_multistepform_wrapper"
        >
            <div className="w-11/12 flex flex-col flex-grow sm:max-w-[400px] md:max-w-[100%]">
                <MultiStepForm
                    initialStep={currentStep}
                    formData={formData}
                    handleSubmit={handleSubmit}
                    handleBack={() => navigate("/")}
                    handleChange={handleChange}
                    handleBackStep={handleBackstep}
                    isDisabled={isDisabled}
                    action={linkAction}
                >
                    <MultiStepForm.Item
                        name={t("create.linkTemplate")}
                        linkType={formData.linkType as LINK_TYPE}
                        handleSubmit={handleSubmitLinkTemplate}
                        isDisabled={isDisabled}
                        render={(props) => <LinkTemplate {...props} />}
                    />
                    <MultiStepForm.Item
                        name={t("create.linkDetails")}
                        handleSubmit={handleSubmitLinkDetails}
                        isDisabled={isDisabled}
                        linkType={formData.linkType as LINK_TYPE}
                        render={(props) => <LinkDetails {...props} />}
                    />
                    <MultiStepForm.Item
                        name={t("create.linkPreview")}
                        handleSubmit={handleSubmit}
                        isDisabled={isDisabled}
                        linkType={formData.linkType as LINK_TYPE}
                        render={(props) => (
                            <LinkPreview
                                {...props}
                                action={linkAction}
                                data={transactionConfirmModel}
                                onConfirm={handleAction}
                            />
                        )}
                    />
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
