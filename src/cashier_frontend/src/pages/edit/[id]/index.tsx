import { useEffect, useState } from "react";
import LinkTemplate, { linkTemplateSchema } from "./LinkTemplate";
import LinkDetails, { linkDetailsSchema } from "./LinkDetails";
import { useNavigate, useParams } from "react-router-dom";
import MultiStepForm from "@/components/multi-step-form";
import { useTranslation } from "react-i18next";
import LinkPreview from "./LinkPreview";
import { useIdentity } from "@nfid/identitykit/react";
import LinkService, { CreateActionInputModel } from "@/services/link.service";
import { useQueryClient } from "@tanstack/react-query";
import { UpdateLinkParams, useCreateAction, useUpdateLink } from "@/hooks/linkHooks";
import { LinkDetailModel, State, Template } from "@/services/types/link.service.types";
import { ConfirmTransactionModel } from "@/components/confirmation-drawer/confirmation-drawer";
import TransactionToast from "@/components/transaction/transaction-toast";
import { useResponsive } from "@/hooks/responsive-hook";
import { getResponsiveClassname } from "@/utils";
import { responsiveMapper } from "./index_responsive";
import { z } from "zod";
import { ACTION_TYPE, INTENT_STATE, LINK_STATE, LINK_TYPE } from "@/services/types/enum";
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

const STEP_LINK_STATE_ORDER = [
    LINK_STATE.CHOOSE_TEMPLATE,
    LINK_STATE.ADD_ASSET,
    LINK_STATE.CREATE_LINK,
];

export default function LinkPage({ initialStep = 0 }: { initialStep?: number }) {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { linkId } = useParams();
    const identity = useIdentity();
    const responsive = useResponsive();
    const { toastData, showToast, hideToast } = useToast();

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

    const queryClient = useQueryClient();
    const { data: linkData } = useLinkDataQuery(linkId, ACTION_TYPE.CREATE_LINK, identity);

    const {
        mutate: updateLink,
        error: updateLinkError,
        mutateAsync: updateLinkAsync,
    } = useUpdateLink(queryClient, identity);
    const { mutateAsync: createAction } = useCreateAction(queryClient, identity);

    useEffect(() => {
        if (linkData) {
            const { link, intent_create, action } = linkData;

            if (link && link.state) {
                const step = STEP_LINK_STATE_ORDER.findIndex((x) => x === link.state);
                setFormData(link);
                setRendering(false);
                setCurrentStep(step >= 0 ? step : 0);
            }

            if (action) {
                console.log("🚀 ~ useEffect ~ action:", action);
                setLinkAction(action);
            }

            if (intent_create && action) {
                setIntentCreate(intent_create);
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
        updateLink(updateLinkParams);
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
            updateLink(updateLinkParams);
            setFormData({ ...formData, ...values });
        } catch (error) {
            console.log("🚀 ~ handleSubmitLinkDetails ~ error:", error);
        }
    };

    const handleCreateAction = async () => {
        const action = await createAction({ linkId: linkId ?? "" });
        setLinkAction(action);
    };

    // User click "Create" button
    const handleSubmit = async () => {
        if (!linkId) return;

        const validationResult = true;

        try {
            if (validationResult) {
                setDisabled(true);

                await handleCreateAction();
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
        transactions: TransactionModel[][] | undefined,
        identity: Identity | undefined,
    ) => {
        if (!identity) return;
        if (!transactions || transactions.length === 0) {
            return;
        }
        try {
            const signerService = new SignerService(identity);
            const icrcxRequests = transactions.map((subTrans) => {
                return subTrans.map((tx) => toCanisterCallRequest(tx));
            });
            const res = await signerService.icrcxExecute(icrcxRequests);
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
            },
            isContinue: true,
        };
        await updateLinkAsync(updateLinkParams);
        navigate(`/details/${linkId}`);
    };

    const startTransaction = async () => {
        const intentService = new IntentService(identity);

        const confirmItemResult = await intentService.confirmIntent(
            linkId ?? "",
            intentCreate?.id ?? "",
        );

        // TODO: Temporary comment out these lines and will update later
        // if (confirmItemResult?.transactions) {
        //     // Change transaction status to processing
        //     setIntentCreate(
        //         (prev) =>
        //             ({
        //                 ...prev,
        //                 transactions: confirmItemResult?.transactions,
        //             }) as IntentCreateModel,
        //     );

        //     setTransactionConfirmModel(
        //         (prevModel) =>
        //             ({
        //                 ...prevModel,
        //                 transactions: confirmItemResult?.transactions,
        //             }) as ConfirmTransactionModel,
        //     );

        //     console.log("Call canister transfer");
        //     const result = await callExecute(intentCreate?.transactions, identity);
        //     if (result) {
        //         console.log(
        //             "Canister service call complete. Now re-fetch the link data to get the intent.",
        //         );
        //         refetch();
        //     }
        // }
    };

    const handleRetryTransactions = () => {
        console.log("Retry");
    };

    // Handle submit action in confirm transaction dialog
    const handleConfirmTransactions = async () => {
        if (!linkId && !intentCreate?.id) return;

        // console.log("Call confirm");
        // try {
        //     if (linkData?.intent_create?.state === INTENT_STATE.SUCCESS) {
        //         await handleUpdateLinkToActive();
        //     } else if (linkData?.intent_create?.state === INTENT_STATE.FAIL) {
        //         handleRetryTransactions();
        //     } else {
        //         await startTransaction();
        //     }
        // } catch (err) {
        //     console.error(err);
        // }
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

            updateLink(updateLinkParams);
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
                    actionCreate={intentCreate}
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
                                onConfirm={handleConfirmTransactions}
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
