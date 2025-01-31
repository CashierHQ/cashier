import { ConfirmationPopupFeesSection } from "@/components/confirmation-popup/confirmation-popup-fees-section";
import { FixedBottomButton } from "@/components/fix-bottom-button";
import LinkCard from "@/components/link-card";
import { ParitalFormProps } from "@/components/multi-step-form";
import { LINK_TEMPLATE_DESCRIPTION_MESSAGE } from "@/constants/message";
import { LINK_TYPE } from "@/services/types/enum";
import { useTranslation } from "react-i18next";

interface LinkData {
    title: string;
    image: string;
    description: string;
}

export default function LinkPreview({
    defaultValues,
    handleSubmit,
    isDisabled = false,
    linkType,
}: ParitalFormProps<object, LinkData>) {
    const { t } = useTranslation();

    if (linkType === LINK_TYPE.TIP_LINK) {
        return (
            <div className="w-full flex flex-col flex-grow">
                <LinkCard
                    label="Tip"
                    src="/icpLogo.png"
                    message={LINK_TEMPLATE_DESCRIPTION_MESSAGE.TIP}
                    title={defaultValues.title as string}
                />

                <ConfirmationPopupFeesSection intents={[]} />

                <FixedBottomButton disabled={isDisabled} onClick={handleSubmit}>
                    {isDisabled ? t("processing") : t("create.create")}
                </FixedBottomButton>
            </div>
        );
    }

    return (
        <div className="w-full flex flex-col flex-grow">
            <LinkCard
                label="Claim"
                src={defaultValues.image as string}
                message={defaultValues.description as string}
                title={defaultValues.title as string}
            />

            <ConfirmationPopupFeesSection intents={[]} />

            <FixedBottomButton disabled={isDisabled} onClick={handleSubmit}>
                {isDisabled ? t("processing") : t("create.create")}
            </FixedBottomButton>
        </div>
    );
}
