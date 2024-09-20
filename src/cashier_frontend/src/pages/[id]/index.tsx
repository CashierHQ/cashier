import { useEffect, useState } from "react";
import LinkTemplate from "./LinkTemplate";
import LinkDetails from "./LinkDetails";
import { useNavigate, useParams } from "react-router-dom";
import MultiStepForm from "@/components/multi-step-form";
import { useTranslation } from "react-i18next";
import LinkPreview from "./LinkPreview";
import { useIdentityKit } from "@nfid/identitykit/react";

export default function LinkPage({ initialStep = 0 }: { initialStep?: number }) {
    const [formData, setFormData] = useState<any>({});
    const [isNameSetByUser, setIsNameSetByUser] = useState(false);
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { linkId } = useParams();
    const { agent, identity } = useIdentityKit();

    useEffect(() => {
        if (linkId) {
            if (linkId === "new") {
            }
        }
    }, [linkId]);

    const handleSubmitLinkTemplate = (values: any) => {
        if (!formData.name || !isNameSetByUser) {
            setFormData({ ...formData, ...values, name: values.linkName });
        }
    };

    const handleSubmitLinkDetails = (values: any) => {
        setFormData({ ...formData, ...values });
    };

    const handleSubmit = (values: any) => {
        console.log("All:", values);
    };

    const handleChange = (values: any) => {
        if (values.name) {
            setIsNameSetByUser(true);
        }
        setFormData({ ...formData, ...values });
    };

    return (
        <div className="w-screen flex flex-col items-center py-5">
            <div className="w-11/12 max-w-[400px]">
                <MultiStepForm
                    initialStep={initialStep}
                    formData={formData}
                    handleSubmit={handleSubmit}
                    handleBack={() => navigate("/")}
                    handleChange={handleChange}
                >
                    <MultiStepForm.Item
                        name={t("create.linkTemplate")}
                        handleSubmit={handleSubmitLinkTemplate}
                        render={(props) => <LinkTemplate {...props} />}
                    />
                    <MultiStepForm.Item
                        name={t("create.linkDetails")}
                        handleSubmit={handleSubmitLinkDetails}
                        render={(props) => <LinkDetails {...props} />}
                    />
                    <MultiStepForm.Item
                        name={t("create.linkPreview")}
                        handleSubmit={handleSubmit}
                        render={(props) => <LinkPreview {...props} />}
                    />
                </MultiStepForm>
            </div>
        </div>
    );
}
