import { useEffect, useState } from "react";
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
import TransactionToast from "@/components/transaction-toast";
import { useResponsive } from "@/hooks/responsive-hook";
import { getReponsiveClassname } from "@/utils";
import { responsiveMapper } from "./index_responsive";
import { z } from "zod";
import { INTENT_STATE, LINK_STATE, LINK_TYPE } from "@/services/types/enum";
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
import { ActionModel } from "@/services/types/refractor.action.service.types";

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
    const [isRendering, setRendering] = useState(true);
    const [disabledConfirmButton, setDisabledConfirmButton] = useState(false);
    const [popupButton, setPopupButton] = useState("");
    const [intentCreate, setIntentCreate] = useState<IntentCreateModel>();
    const [linkAction, setLinkAction] = useState<ActionModel>();
    const [transactionConfirmModel, setTransactionConfirmModel] =
        useState<ConfirmTransactionModel>();
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { linkId } = useParams();
    const identity = useIdentity();
    const responsive = useResponsive();
    const queryClient = useQueryClient();
    const { toastData, showToast, hideToast } = useToast();
    const { mutate, error: updateLinkError, mutateAsync } = useUpdateLink(queryClient, identity);
    const { data: linkData, refetch } = useQuery({
        queryKey: queryKeys.links.detail(linkId, identity).queryKey,
        queryFn: queryKeys.links.detail(linkId, identity).queryFn,
        enabled: !!linkId && !!identity,
    });

    useEffect(() => {
        if (linkData) {
            console.log(linkData);
            const { link, intent_create, action } = linkData;
            if (link && link.state) {
                const step = STEP_LINK_STATE_ORDER.findIndex((x) => x === link.state);
                setFormData(link);
                setRendering(false);
                setCurrentStep(step >= 0 ? step : 0);
            }
            if (intent_create && action) {
                setIntentCreate(intent_create);
                setLinkAction(action);
                /* TODO: Update this setTransactionConfirmModel */
                // setTransactionConfirmModel(
                //     (prevModel) =>
                //         ({
                //             ...prevModel,
                //             transactions: linkData?.intent_create?.transactions,
                //         }) as ConfirmTransactionModel,
                // );
            }
        }

        /*TODO: Update the button state based on the intent state */
        if (linkData?.intent_create?.state === INTENT_STATE.SUCCESS) {
            setPopupButton(t("continue"));
            setDisabledConfirmButton(false);
        }
        if (linkData?.intent_create?.state === INTENT_STATE.FAIL) {
            setPopupButton(t("Retry"));
            setDisabledConfirmButton(false);
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

    /*TODO: Update this function: remove the createActionInput param*/
    const handleCreateAction = async (
        linkService: LinkService,
        createActionInput: CreateIntentInput,
    ) => {
        const intentCreateConsentInput: GetConsentMessageInput = {
            link_id: linkId ?? "",
            intent_type: "Create",
            params: [],
            intent_id: intentCreate?.id ?? "",
        };

        /*TODO: Consider to remove the "consent" variable */
        const consent = intentCreate
            ? await linkService.getConsentMessage(intentCreateConsentInput)
            : await linkService.createAction(createActionInput).then((result) => {
                  setLinkAction(result);
              });

        const action = linkAction ?? (await linkService.createAction(createActionInput));
        if (action) {
            setLinkAction(action);
        }

        /*TODO: Use the "action" instead of "consent" to pass into the ConfirmTransactionModel */
        if (consent) {
            const transactionConfirmObj: ConfirmTransactionModel = {
                linkName: formData.title ?? "",
                feeModel: consent,
                transactions: intentCreate?.transactions,
                action: action,
            };
            setTransactionConfirmModel(transactionConfirmObj);
            setOpenConfirmationPopup(true);
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

                await handleCreateAction(linkService, createActionInput);
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
        setDisabledConfirmButton(true);
        setPopupButton(t("processing"));
        const updateLinkParams: UpdateLinkParams = {
            linkId: linkId ?? "",
            linkModel: {
                ...formData,
            },
            isContinue: true,
        };
        await mutateAsync(updateLinkParams);
        navigate(`/details/${linkId}`);
    };

    const startTransaction = async () => {
        setDisabledConfirmButton(true);
        setPopupButton(t("transaction.confirm_popup.inprogress_button"));
        const intentService = new IntentService(identity);
        const confirmItenResult = await intentService.confirmIntent(
            linkId ?? "",
            intentCreate?.id ?? "",
        );
        if (confirmItenResult?.transactions) {
            // Change transaction status to processing
            setIntentCreate(
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
            const result = await callExecute(intentCreate?.transactions, identity);
            if (result) {
                console.log(
                    "Canister service call complete. Now re-fetch the link data to get the intent.",
                );
                refetch();
            }
        }
    };

    const handleRetryTransactions = () => {
        console.log("Retry");
    };

    // Handle submit action in confirm transaction dialog
    const handleConfirmTransactions = async () => {
        if (!linkId && !intentCreate?.id) return;
        /*TODO: Temporary hold off the Confirm feature */
        console.log("Call confirm");
        // try {
        //     if (linkData?.intent_create?.state === INTENT_STATE.SUCCESS) {
        //         await handleUpdateLinkToActive();
        //     } else if (linkData?.intent_create?.state === INTENT_STATE.FAIL) {
        //         handleRetryTransactions();
        //     } else {
        //         await startTransaction();
        //     }
        // } catch (err) {
        //     console.log(err);
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
