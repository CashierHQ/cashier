import { useEffect, useState } from "react";
import LinkTemplate from "./LinkTemplate";
import LinkDetails from "./LinkDetails";
import { useNavigate, useParams } from "react-router-dom";
import MultiStepForm from "@/components/multi-step-form";
import { useTranslation } from "react-i18next";
import LinkPreview from "./LinkPreview";
import { useIdentityKit } from "@nfid/identitykit/react";
import LinkService from "@/services/link.service";

export default function LinkPage({ initialStep = 0 }: { initialStep?: number }) {
    const [formData, setFormData] = useState<any>({});
    const [isNameSetByUser, setIsNameSetByUser] = useState(false);
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { linkId } = useParams();
    const { identity } = useIdentityKit();
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (!linkId) return;
        if (!identity) return;
        const fetchData = async () => {
            const link = await new LinkService(identity).getLink(linkId);
            setFormData(link);
            setIsNameSetByUser(true);
            setIsLoading(false);
        };
        fetchData();
    }, [linkId, identity]);

    const handleSubmitLinkTemplate = async (values: any) => {
        if (!linkId) return;
        if (!formData.name || !isNameSetByUser) {
            values.name = values.title;
        }
        setFormData({ ...formData, ...values });
        await new LinkService(identity).updateLink(linkId, {
            ...formData,
            ...values,
            state: {
                PendingDetail: null,
            },
        });
    };

    const handleSubmitLinkDetails = async (values: any) => {
        if (!linkId) return;
        console.log(linkId);
        try {
            setFormData({ ...formData, ...values });
            await new LinkService(identity).updateLink(linkId, {
                ...formData,
                ...values,
                state: {
                    PendingPreview: null,
                },
            });
        } catch (error) {
            console.log(error);
        }
    };

    const handleSubmit = async (values: any) => {
        if (!linkId) return;
        try {
            await new LinkService(identity).updateLink(linkId, {
                ...formData,
                ...values,
                actions: [
                    { arg: "string", method: "string", canister_id: "string", label: "string" },
                ],
                state: {
                    Active: null,
                },
            });
            navigate(`/details/${linkId}`);
        } catch (error) {
            console.log(error);
        }
    };

    const handleChange = (values: any) => {
        if (values.name) {
            setIsNameSetByUser(true);
        }
        setFormData({ ...formData, ...values });
    };

    if (isLoading) return null;

    return (
        <div className="w-screen flex flex-col items-center py-3">
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
