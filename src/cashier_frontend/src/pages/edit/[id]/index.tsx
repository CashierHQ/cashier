import { useEffect, useRef, useState } from "react";
import LinkTemplate, { linkTemplateSchema } from "./LinkTemplate";
import LinkDetails, { linkDetailsSchema } from "./LinkDetails";
import { useNavigate, useParams } from "react-router-dom";
import MultiStepForm from "@/components/multi-step-form";
import { useTranslation } from "react-i18next";
import LinkPreview from "./LinkPreview";
import { useIdentity } from "@nfid/identitykit/react";
import LinkService from "@/services/link.service";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { UpdateLinkParams, useUpdateLink } from "@/hooks/linkHooks";
import { LinkDetailModel, State, Template } from "@/services/types/link.service.types";
import { Drawer } from "@/components/ui/drawer";
import ConfirmationPopup, { ConfirmTransactionModel } from "@/components/confirmation-popup";
import TransactionToast, { TransactionToastProps } from "@/components/transaction-toast";
import { useResponsive } from "@/hooks/responsive-hook";
import { getReponsiveClassname } from "@/utils";
import { responsiveMapper } from "./index_responsive";
import { z } from "zod";
import { INTENT_STATE, LINK_STATE, LINK_TYPE, TRANSACTION_STATE } from "@/services/types/enum";
import {
    CreateIntentInput,
    GetConsentMessageInput,
} from "../../../../../declarations/cashier_backend/cashier_backend.did";
import { IntentCreateModel, TransactionModel } from "@/services/types/intent.service.types";
import IntentService from "@/services/intent.service";
import SignerService from "@/services/signer.service";
import { Identity } from "@dfinity/agent";
import { toCanisterCallRequest } from "@/services/types/mapper/intent.service.mapper";
import useToast from "@/hooks/useToast";
import { getCashierError } from "@/services/errorProcess.service";
import { queryKeys } from "@/lib/queryKeys";

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
    const [openConfirmationPopup, setOpenConfirmationPopup] = useState(false);
    const [currentStep, setCurrentStep] = useState<number>(initialStep);
    //const [toastData, setToastData] = useState<TransactionToastProps | null>(null);
    const [isRendering, setRendering] = useState(true);
    const [disabledConfirmButton, setDisabledConfirmButton] = useState(false);
    const [popupButton, setPopupButton] = useState("");
    const [actionCreate, setActionCreate] = useState<IntentCreateModel>();
    const [transactionConfirmModel, setTransactionConfirmModel] =
        useState<ConfirmTransactionModel>();
    const [shouldPoll, setShouldPoll] = useState(false);
    const intervalRef = useRef<number | undefined>(undefined);

    const { t } = useTranslation();
    const navigate = useNavigate();
    const { linkId } = useParams();
    const identity = useIdentity();
    const responsive = useResponsive();
    const queryClient = useQueryClient();
    const { toastData, showToast, hideToast } = useToast();
    const { mutate, error: updateLinkError, mutateAsync } = useUpdateLink(queryClient, identity);
    const { data: updatedLinkDetail, refetch } = useQuery({
        queryKey: queryKeys.links.detail(linkId, identity).queryKey,
        queryFn: queryKeys.links.detail(linkId, identity).queryFn,
        enabled: !!linkId,
    });

    useEffect(() => {
        if (!linkId) return;
        if (!identity) return;
        const fetchData = async () => {
            const linkObj = await new LinkService(identity).getLink(linkId);
            const { link, intent_create } = linkObj;
            console.log("🚀 ~ fetchData ~ linkObj:", linkObj);
            if (link && link.state) {
                const step = STEP_LINK_STATE_ORDER.findIndex((x) => x === link.state);
                setFormData(link);
                setRendering(false);
                setCurrentStep(step >= 0 ? step : 0);
            }
            if (intent_create) {
                setActionCreate(intent_create);
                if (intent_create?.state === INTENT_STATE.SUCCESS) {
                    setPopupButton(t("continue"));
                }
            }
        };
        try {
            fetchData();
        } catch (err) {
            console.log("🚀 ~ useEffect ~ err:", err);
        }
    }, [linkId, identity]);

    useEffect(() => {
        if (shouldPoll && updatedLinkDetail?.intent_create?.state === INTENT_STATE.PROCESSING) {
            intervalRef.current = window.setInterval(() => {
                refetch();
            }, 1000);
        } else {
            if (intervalRef.current !== undefined) {
                clearInterval(intervalRef.current);
                intervalRef.current = undefined;
            }
            setShouldPoll(false);
        }
        return () => {
            if (intervalRef.current !== undefined) {
                clearInterval(intervalRef.current);
                intervalRef.current = undefined;
            }
        };
    }, [shouldPoll, updatedLinkDetail, refetch]);

    useEffect(() => {
        if (updatedLinkDetail?.intent_create?.transactions?.length) {
            setActionCreate(
                (prev) =>
                    ({
                        ...prev,
                        transactions: updatedLinkDetail?.intent_create?.transactions,
                    }) as IntentCreateModel,
            );
            setTransactionConfirmModel(
                (prevModel) =>
                    ({
                        ...prevModel,
                        transactions: updatedLinkDetail?.intent_create?.transactions,
                    }) as ConfirmTransactionModel,
            );
        }
        if (updatedLinkDetail?.intent_create?.state !== INTENT_STATE.PROCESSING) {
            setShouldPoll(false);
        }
        if (updatedLinkDetail?.intent_create?.state === INTENT_STATE.SUCCESS) {
            setPopupButton(t("continue"));
            setDisabledConfirmButton(false);
        }
    }, [updatedLinkDetail]);

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

    // User click "Create" button
    const handleSubmit = async () => {
        if (!linkId) return;
        const validationResult = true;
        try {
            if (validationResult) {
                const linkService = new LinkService(identity);
                setDisabled(true);
                const createActionInput: CreateIntentInput = {
                    link_id: linkId ?? "",
                    intent_type: "Create",
                    params: [],
                };
                const handleCreateAction = async () => {
                    const intentCreateConsentInput: GetConsentMessageInput = {
                        link_id: linkId ?? "",
                        intent_type: "Create",
                        params: [],
                        intent_id: actionCreate?.id ?? "",
                    };

                    const consent = actionCreate
                        ? await linkService.getConsentMessage(intentCreateConsentInput)
                        : await linkService.createAction(createActionInput).then((result) => {
                              setActionCreate(result.intent);
                              return result.consent;
                          });

                    if (consent) {
                        const transactionConfirmObj: ConfirmTransactionModel = {
                            linkName: formData.title ?? "",
                            feeModel: consent,
                            transactions: actionCreate?.transactions,
                        };
                        setTransactionConfirmModel(transactionConfirmObj);
                        setOpenConfirmationPopup(true);
                    }
                };
                if (actionCreate || createActionInput) {
                    await handleCreateAction();
                }
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
            console.log("THERE IS NO TRANSACTION --> RETURN");
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

    const handleConfirmTransactions = async () => {
        setDisabledConfirmButton(true);
        setPopupButton(t("transaction.confirm_popup.inprogress_button") as string);
        if (!linkId && !actionCreate?.id) return;
        try {
            if (updatedLinkDetail?.intent_create?.state === INTENT_STATE.SUCCESS) {
                console.log("ALL OF THE TRANS SUCCESS. CALL TO UPDATE LINK TO ACTIVE");
                const updateLinkParams: UpdateLinkParams = {
                    linkId: linkId ?? "",
                    linkModel: {
                        ...formData,
                    },
                    isContinue: true,
                };
                console.log(updateLinkParams);
                await mutateAsync(updateLinkParams);
                navigate(`/details/${linkId}`);
            } else {
                const intentService = new IntentService(identity);
                const confirmItenResult = await intentService.confirmIntent(
                    linkId ?? "",
                    actionCreate?.id ?? "",
                );
                console.log(
                    "🚀 ~ handleConfirmTransactions ~ confirmItenResult:",
                    confirmItenResult,
                );
                if (confirmItenResult?.transactions) {
                    // Change transaction status to processing
                    setActionCreate(
                        (prev) =>
                            ({
                                ...prev,
                                transactions: confirmItenResult?.transactions,
                            }) as IntentCreateModel,
                    );
                    setTransactionConfirmModel(
                        (prevModel) =>
                            ({
                                ...prevModel,
                                transactions: confirmItenResult?.transactions,
                            }) as ConfirmTransactionModel,
                    );

                    console.log("Call canister transfer");
                    const result = await callExecute(actionCreate?.transactions, identity);
                    if (result) {
                        console.log(
                            "Canister service call complete. Now re-fetch the link data to get the intent.",
                        );
                        setShouldPoll(true);
                    }
                }
            }
        } catch (err) {
            console.log(err);
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
            className={getReponsiveClassname(
                responsive,
                responsiveMapper.find((o) => (o.htmlId = "edit_multistepform_wrapper")),
            )}
            id="edit_multistepform_wrapper"
        >
            <div className="w-11/12 max-w-[400px]">
                <MultiStepForm
                    initialStep={currentStep}
                    formData={formData}
                    handleSubmit={handleSubmit}
                    handleBack={() => navigate("/")}
                    handleChange={handleChange}
                    handleBackStep={handleBackstep}
                    isDisabled={isDisabled}
                    actionCreate={actionCreate}
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
                        render={(props) => <LinkPreview {...props} />}
                    />
                </MultiStepForm>
                <Drawer open={openConfirmationPopup}>
                    <ConfirmationPopup
                        data={transactionConfirmModel}
                        handleConfirm={handleConfirmTransactions}
                        handleClose={() => setOpenConfirmationPopup(false)}
                        disabled={disabledConfirmButton}
                        buttonText={
                            popupButton.length > 0
                                ? popupButton
                                : t("transaction.confirm_popup.confirm_button")
                        }
                    />
                </Drawer>
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
