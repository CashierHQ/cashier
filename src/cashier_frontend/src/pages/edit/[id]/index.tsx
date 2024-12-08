import { useEffect, useState } from "react";
import LinkTemplate, { linkTemplateSchema } from "./LinkTemplate";
import LinkDetails from "./LinkDetails";
import { useNavigate, useParams } from "react-router-dom";
import MultiStepForm from "@/components/multi-step-form";
import { useTranslation } from "react-i18next";
import LinkPreview from "./LinkPreview";
import { useIdentityKit } from "@nfid/identitykit/react";
import LinkService from "@/services/link.service";
import { LINK_STATUS } from "@/constants/otherConst";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/queryKeys";
import { UpdateLinkParams, useUpdateLink } from "@/hooks/linkHooks";
import { LinkDetailModel, State, Template } from "@/services/types/link.service.types";
import { DrawerTrigger, Drawer } from "@/components/ui/drawer";
import ConfirmationPopup from "@/components/confirmation-popup";
import TransactionToast, { TransactionToastProps } from "@/components/transaction-toast";
import { Toast } from "@radix-ui/react-toast";
import { useResponsive } from "@/hooks/responsive-hook";
import { getReponsiveClassname } from "@/utils";
import { responsiveMapper } from "./index_responsive";
import { z } from "zod";
import { LINK_STATE } from "@/services/types/enum";

const STEP_LINK_STATUS_ORDER = [
    LINK_STATE.CHOOSETEMPLATE,
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
        template: Template.Left,
        create_at: new Date(),
        amount: 0,
    });
    const [isNameSetByUser, setIsNameSetByUser] = useState(false);
    const [isDisabled, setDisabled] = useState(false);
    const [openConfirmationPopup, setOpenConfirmationPopup] = useState(false);
    const [openValidtionToast, setOpenValidtionToast] = useState(false);
    const [currentStep, setCurrentStep] = useState<number>(initialStep);
    const [toastData, setToastData] = useState<TransactionToastProps | null>(null);
    const [isRendering, setRendering] = useState(true);
    const [disabledConfirmButton, setDisabledConfirmButton] = useState(false);
    const [popupButton, setPopupButton] = useState("");

    const { t } = useTranslation();
    const navigate = useNavigate();
    const { linkId } = useParams();
    const { identity } = useIdentityKit();
    const responsive = useResponsive();

    const queryClient = useQueryClient();
    const { mutate, mutateAsync, error: updateLinkError } = useUpdateLink(queryClient, identity);

    useEffect(() => {
        if (!linkId) return;
        if (!identity) return;
        const fetchData = async () => {
            const link = await new LinkService(identity).getLink(linkId);
            console.log("🚀 ~ fetchData ~ link:", link);
            if (link && link.state) {
                const step = STEP_LINK_STATUS_ORDER.findIndex((x) => x === link.state);
                setFormData(link);
                setIsNameSetByUser(true);
                setRendering(false);
                setCurrentStep(step >= 0 ? step : 0);
            }
        };
        try {
            fetchData();
        } catch (err) {
            console.log(err);
        }
    }, [linkId, identity]);

    const handleSubmitLinkTemplate = async (values: z.infer<typeof linkTemplateSchema>) => {
        console.log("🚀 ~ handleSubmitLinkTemplate ~ values:", values);
        if (!linkId) return;
        // if (!formData?.title || !isNameSetByUser) {
        //     values.name = values.title;
        // }
        const updateLinkParams: UpdateLinkParams = {
            linkId: linkId,
            linkModel: {
                ...formData,
                title: values.title,
            },
            isContinue: true,
        };
        mutate(updateLinkParams);
        if (updateLinkError) {
            throw updateLinkError;
        }
        setFormData({ ...formData, ...values });
    };

    const handleSubmitLinkDetails = async (values: any) => {
        if (!linkId) return;
        try {
            formData.state = State.PendingPreview;
            const updateLinkParams: UpdateLinkParams = {
                linkId: linkId,
                linkModel: {
                    ...formData,
                    ...values,
                },
                isContinue: true,
            };
            console.log("🚀 ~ handleSubmitLinkDetails ~ updateLinkParams:", updateLinkParams);
            mutate(updateLinkParams);
            setFormData({ ...formData, ...values });
        } catch (error) {
            console.log(error);
        }
    };

    const handleSubmit = async (values: any) => {
        if (!linkId) return;
        const validationResult = true;
        try {
            // 1. Call validation, success -> display confirm popup,
            //   failed -> display error message
            if (validationResult) {
                setDisabled(true);
                const updateLinkParams: UpdateLinkParams = {
                    linkId: linkId,
                    linkModel: {
                        ...formData,
                        ...values,
                    },
                    isContinue: true,
                };
                await mutateAsync(updateLinkParams);
                navigate(`/details/${linkId}`);
                // setOpenConfirmationPopup(true);
            } else {
                setToastData({
                    open: true,
                    title: t("transaction.validation.action_failed"),
                    description: t("transaction.validation.action_failed_message"),
                    variant: "error",
                });
                setOpenValidtionToast(true);
            }
        } catch (error) {
            setDisabled(false);
            console.log(error);
        }
    };

    const handleChange = (values: any) => {
        if (values.name) {
            setIsNameSetByUser(true);
        }
        setFormData({ ...formData, ...values });
    };

    const handleConfirmTransactions = () => {
        setDisabledConfirmButton(true);
        setPopupButton(t("transaction.confirm_popup.inprogress_button") as string);
        setToastData({
            open: true,
            title: t("transaction.confirm_popup.transaction_failed"),
            description: t("transaction.confirm_popup.transaction_failed_message"),
            variant: "error",
        });
        setOpenValidtionToast(true);
        setTimeout(() => {
            setDisabledConfirmButton(false);
            setPopupButton(t("transaction.confirm_popup.retry_button") as string);
        }, 3000);
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
                >
                    <MultiStepForm.Item
                        name={t("create.linkTemplate")}
                        handleSubmit={handleSubmitLinkTemplate}
                        isDisabled={isDisabled}
                        render={(props) => <LinkTemplate {...props} />}
                    />
                    <MultiStepForm.Item
                        name={t("create.linkDetails")}
                        handleSubmit={handleSubmitLinkDetails}
                        isDisabled={isDisabled}
                        render={(props) => <LinkDetails {...props} />}
                    />
                    <MultiStepForm.Item
                        name={t("create.linkPreview")}
                        handleSubmit={handleSubmit}
                        isDisabled={isDisabled}
                        render={(props) => <LinkPreview {...props} isDisabled />}
                    />
                </MultiStepForm>
                <Drawer open={openConfirmationPopup}>
                    <ConfirmationPopup
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
                    open={openValidtionToast}
                    onOpenChange={setOpenValidtionToast}
                    title={toastData?.title ?? ""}
                    description={toastData?.description ?? ""}
                    variant={toastData?.variant ?? "default"}
                />
            </div>
        </div>
    );
}
