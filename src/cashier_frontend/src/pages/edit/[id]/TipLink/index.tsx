import { useEffect, useState } from "react";
import TipLinkTemplate from "./TipLinkTemplate";
import TipLinkDetails from "./TipLinkDetails";
import { useNavigate, useParams } from "react-router-dom";
import MultiStepForm from "@/components/multi-step-form";
import { useTranslation } from "react-i18next";
import { useIdentityKit } from "@nfid/identitykit/react";
import LinkService from "@/services/link.service";
import { LINK_STATUS } from "@/constants/otherConst";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/queryKeys";
import { UpdateLinkParams, useUpdateLink } from "@/hooks/linkHooks";
import { LinkDetailModel, State, Template } from "@/services/types/link.service.types";

const STEP_LINK_STATUS_ORDER = [
    LINK_STATUS.NEW,
    LINK_STATUS.PENDING_DETAIL,
    LINK_STATUS.PENDING_PREVIEW,
];

export default function TipLink({ initialStep = 0 }: { initialStep?: number }) {
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
    const [currentStep, setCurrentStep] = useState<number>(initialStep);
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { linkId } = useParams();
    const { identity } = useIdentityKit();
    //const [isRendering, setRendering] = useState(true);

    const handleSubmit = () => {
        console.log("Submit");
    };

    const handleChange = (values: any) => {
        console.log("Change");
    };

    //if (isRendering) return null;

    return (
        <div className="w-screen flex flex-col items-center py-3">
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
                        handleSubmit={handleSubmit}
                        isDisabled={isDisabled}
                        render={(props) => <TipLinkTemplate {...props} />}
                    />
                    <MultiStepForm.Item
                        name={t("create.linkDetails")}
                        handleSubmit={handleSubmit}
                        isDisabled={isDisabled}
                        render={(props) => <TipLinkDetails {...props} />}
                    />
                    {/* <MultiStepForm.Item
                        name={t("create.linkPreview")}
                        handleSubmit={handleSubmit}
                        isDisabled={isDisabled}
                        render={(props) => <LinkPreview {...props} isDisabled />}
                    /> */}
                </MultiStepForm>
            </div>
        </div>
    );
}
