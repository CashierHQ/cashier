import { useEffect, useState } from "react";
import LinkTemplate, { linkTemplateSchema } from "./LinkTemplate";
import LinkDetails, { linkDetailsSchema } from "./LinkDetails";
import { useNavigate, useParams } from "react-router-dom";
import MultiStepForm from "@/components/multi-step-form";
import { useTranslation } from "react-i18next";
import LinkPreview from "./LinkPreview";
import { useIdentity } from "@nfid/identitykit/react";
import LinkService from "@/services/link.service";
import { useQueryClient } from "@tanstack/react-query";
import { UpdateLinkParams, useUpdateLink } from "@/hooks/linkHooks";
import { LinkDetailModel, State, Template } from "@/services/types/link.service.types";
import { Drawer } from "@/components/ui/drawer";
import ConfirmationPopup, { ConfirmTransactionModel } from "@/components/confirmation-popup";
import TransactionToast, { TransactionToastProps } from "@/components/transaction-toast";
import { useResponsive } from "@/hooks/responsive-hook";
import { convertTokenAmountToNumber, getReponsiveClassname } from "@/utils";
import { responsiveMapper } from "./index_responsive";
import { z } from "zod";
import { LINK_STATE, LINK_TYPE } from "@/services/types/enum";
import { CreateIntentInput } from "../../../../../declarations/cashier_backend/cashier_backend.did";
import { IntentCreateModel } from "@/services/types/intent.service.types";
import { defaultAgent } from "@dfinity/utils";
import useTokenMetadata from "@/hooks/tokenUtilsHooks";

const STEP_LINK_STATE_ORDER = [
    LINK_STATE.CHOOSE_TEMPLATE,
    LINK_STATE.ADD_ASSET,
    LINK_STATE.CREATE_LINK,
];

export default function LinkPage({ initialStep = 0 }: { initialStep?: number }) {
    const anonymousAgent = defaultAgent();
    const [formData, setFormData] = useState<LinkDetailModel>({
        id: "",
        title: "",
        image: "",
        description: "",
        state: "",
        template: Template.Central,
        create_at: new Date(),
        amount: 0,
        linkType: LINK_TYPE.NFT_CREATE_AND_AIRDROP,
        tokenAddress: "",
    });
    const [isDisabled, setDisabled] = useState(false);
    const [openConfirmationPopup, setOpenConfirmationPopup] = useState(false);
    const [currentStep, setCurrentStep] = useState<number>(initialStep);
    const [toastData, setToastData] = useState<TransactionToastProps | null>(null);
    const [isRendering, setRendering] = useState(true);
    const [disabledConfirmButton, setDisabledConfirmButton] = useState(false);
    const [popupButton, setPopupButton] = useState("");
    const [actionCreate, setActionCreate] = useState<IntentCreateModel>();
    const [transactionConfirmModel, setTransactionConfirmModel] =
        useState<ConfirmTransactionModel>();

    const { t } = useTranslation();
    const navigate = useNavigate();
    const { linkId } = useParams();
    const identity = useIdentity();
    const responsive = useResponsive();
    const { metadata } = useTokenMetadata(anonymousAgent, formData.tokenAddress);

    const queryClient = useQueryClient();
    const { mutate, mutateAsync, error: updateLinkError } = useUpdateLink(queryClient, identity);

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
            }
        };
        try {
            fetchData();
        } catch (err) {
            console.log("🚀 ~ useEffect ~ err:", err);
        }
    }, [linkId, identity]);

    const handleSubmitLinkTemplate = async (values: z.infer<typeof linkTemplateSchema>) => {
        if (!linkId) return;
        if (values.linkType === LINK_TYPE.NFT_CREATE_AND_AIRDROP) {
            setToastData({
                open: true,
                title: "Unsupported link type",
                description:
                    "The NFT is currently not supported now. Please choose another link type.",
                variant: "error",
            });
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

        // Get selected token metadata
        if (values.amount && values.tokenAddress) {
            const tokenDecimals = metadata?.decimals;
            console.log("🚀 ~ handleSubmitLinkDetails ~ tokenDecimals:", tokenDecimals);
            if (tokenDecimals) {
                values.amount = convertTokenAmountToNumber(values.amount, tokenDecimals);
            }
        }
        try {
            formData.state = State.PendingPreview;
            const updateLinkParams: UpdateLinkParams = {
                linkId: linkId,
                linkModel: {
                    ...formData,
                    ...values,
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

    const handleSubmit = async () => {
        if (!linkId) return;
        const validationResult = true;
        try {
            // 1. Call validation, success -> display confirm popup,
            //   failed -> display error message
            if (validationResult) {
                setDisabled(true);
                const createActionInput: CreateIntentInput = {
                    link_id: linkId,
                    intent_type: "Create",
                    params: [],
                };
                const linkService = new LinkService(identity);
                const createActionResult = await linkService.createAction(createActionInput);
                console.log("🚀 ~ handleSubmit ~ createActionResult:", createActionResult);
                if (createActionResult) {
                    const transactionConfirmObj: ConfirmTransactionModel = {
                        linkName: formData.title ?? "",
                        feeModel: createActionResult.consent,
                    };
                    setTransactionConfirmModel(transactionConfirmObj);
                    setActionCreate(createActionResult.intent);
                    setOpenConfirmationPopup(true);
                }
            } else {
                setToastData({
                    open: true,
                    title: t("transaction.validation.action_failed"),
                    description: t("transaction.validation.action_failed_message"),
                    variant: "error",
                });
            }
        } catch (error) {
            console.log("🚀 ~ handleSubmit ~ error:", error);
            setDisabled(false);
        }
    };

    const handleChange = (values: Partial<LinkDetailModel>) => {
        console.log(values);
        setFormData({ ...formData, ...values });
    };

    const handleConfirmTransactions = async () => {
        setDisabledConfirmButton(true);
        setPopupButton(t("transaction.confirm_popup.inprogress_button") as string);
        if (!linkId) return;
        const updateLinkParams: UpdateLinkParams = {
            linkId: linkId,
            linkModel: {
                ...formData,
                description: "aaa",
            },
            isContinue: true,
        };
        await mutateAsync(updateLinkParams);
        navigate(`/details/${linkId}`);
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
                    onOpenChange={(open) =>
                        setToastData({
                            open: open as boolean,
                            title: "",
                            description: "",
                            variant: null,
                        })
                    }
                    title={toastData?.title ?? ""}
                    description={toastData?.description ?? ""}
                    variant={toastData?.variant ?? "default"}
                />
            </div>
        </div>
    );
}
