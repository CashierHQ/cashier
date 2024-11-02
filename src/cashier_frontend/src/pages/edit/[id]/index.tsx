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
import { LinkDetailModel, State } from "@/services/types/link.service.types";

const STEP_LINK_STATUS_ORDER = [
    LINK_STATUS.NEW,
    LINK_STATUS.PENDING_DETAIL,
    LINK_STATUS.PENDING_PREVIEW,
];

export default function LinkPage({ initialStep = 0 }: { initialStep?: number }) {
    const [formData, setFormData] = useState<LinkDetailModel>({});
    const [isNameSetByUser, setIsNameSetByUser] = useState(false);
    const [isDisabled, setDisabled] = useState(false);
    const [currentStep, setCurrentStep] = useState<number>(initialStep);
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { linkId } = useParams();
    const { identity } = useIdentityKit();
    const [isRendering, setRendering] = useState(true);
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
            if (!formData.title || !isNameSetByUser) {
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
        try {
            setDisabled(true);
            const updateLinkParams: UpdateLinkParams = {
                linkId: linkId,
                linkModel: {
                    ...formData,
                    ...values,
                    state: State.Active,
                },
            };
            await mutateAsync(updateLinkParams);
            navigate(`/details/${linkId}`);
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

    if (isRendering) return null;

    return (
        <div className="w-screen flex flex-col items-center py-3">
            <div className="w-11/12 max-w-[400px]">
                <MultiStepForm
                    initialStep={currentStep}
                    formData={formData}
                    handleSubmit={handleSubmit}
                    handleBack={() => navigate("/")}
                    handleChange={handleChange}
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
            </div>
        </div>
    );
}
