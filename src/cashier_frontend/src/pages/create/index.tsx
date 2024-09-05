import { useState } from "react";
import LinkTemplate from "./LinkTemplate";
import LinkDetails from "./LinkDetails";
import { useNavigate } from "react-router-dom";
import MultiStepForm from "@/components/composite/MultiStepForm";
import { useTranslation } from "react-i18next";

export default function CreatePage({ initialStep = 0 }: { initialStep: number }) {
    const [formData, setFormData] = useState<any>({});
    const { t } = useTranslation();
    const navigate = useNavigate();

    const handleSubmitLinkTemplate = (values: any) => {
        if (!formData.name) {
            setFormData({ ...formData, ...values, name: values.linkName });
        }
    }

    const handleSubmitLinkDetails = (values: any) => {
        setFormData({ ...formData, ...values });
    }

    const handleSubmit = (values: any) => {
        console.log(values);
    }

    return (
        <div className="w-screen flex flex-col items-center py-5">
            <div className="w-11/12 max-w-[400px]">
                <MultiStepForm
                    initialStep={initialStep}
                    formData={formData}
                    handleSubmit={handleSubmit}
                    handleBack={() => navigate('/')}
                >
                    <MultiStepForm.Item
                        name={t('create.linkTemplate')}
                        handleSubmit={handleSubmitLinkTemplate}
                        render={(defaultValues, handleSubmit) => <LinkTemplate defaultValues={defaultValues} handleSubmit={handleSubmit} />}
                    />
                    <MultiStepForm.Item
                        name={t('create.linkDetails')}
                        handleSubmit={handleSubmitLinkDetails}
                        render={(defaultValues, handleSubmit) => <LinkDetails defaultValues={defaultValues} handleSubmit={handleSubmit} />}
                    />
                </MultiStepForm>
            </div>
        </div>
    );
}