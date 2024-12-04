import { useEffect, useState } from "react";
import LinkTemplate from "./LinkTemplate";
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

const STEP_LINK_STATUS_ORDER = [
    LINK_STATUS.NEW,
    LINK_STATUS.PENDING_DETAIL,
    LINK_STATUS.PENDING_PREVIEW,
];

export default function LinkPage({ initialStep = 0 }: { initialStep?: number }) {
    const [formData, setFormData] = useState<LinkDetailModel>({
        id: "",
        title: "",
        image: "",
        description: "",
        amount: 0,
        chain: "",
        state: "",
        actions: [],
        template: Template.Left,
        create_at: new Date(),
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
    const { mutate, mutateAsync } = useUpdateLink(queryClient, identity);

    useEffect(() => {
        if (!linkId) return;
        if (!identity) return;
        const fetchData = async () => {
            const link = await new LinkService(identity).getLink(linkId);
            if (link && link.state) {
                const step = STEP_LINK_STATUS_ORDER.findIndex((x) => x === link.state);
                setFormData(link);
                setIsNameSetByUser(true);
                setRendering(false);
                setCurrentStep(step >= 0 ? step : 0);
            }
        };
        fetchData();
    }, [linkId, identity]);

    const handleSubmitLinkTemplate = async (values: any) => {
        if (!linkId) return;
        try {
            if (!formData?.title || !isNameSetByUser) {
                values.name = values.title;
            }
            formData.state = State.PendingDetail;
            const updateLinkParams: UpdateLinkParams = {
                linkId: linkId,
                linkModel: {
                    ...formData,
                    ...values,
                },
            };
            mutate(updateLinkParams);
            setFormData({ ...formData, ...values });
        } catch (err) {
            console.log(err);
        }
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
            };
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
                setOpenConfirmationPopup(true);
            } else {
                setToastData({
                    open: true,
                    title: t("transaction.validation.action_failed"),
                    description: t("transaction.validation.action_failed_message"),
                    variant: "error",
                });
                setOpenValidtionToast(true);
            }
            // setDisabled(true);
            // const updateLinkParams: UpdateLinkParams = {
            //     linkId: linkId,
            //     linkModel: {
            //         ...formData,
            //         ...values,
            //         state: State.Active,
            //     },
            // };
            // await mutateAsync(updateLinkParams);
            // navigate(`/details/${linkId}`);
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
