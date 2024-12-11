import { FixedBottomButton } from "@/components/fix-bottom-button";
import LinkCard from "@/components/link-card";
import { ParitalFormProps } from "@/components/multi-step-form";
import { useTranslation } from "react-i18next";

interface LinkData {
    name: string;
    image: string;
    description: string;
}

export default function LinkPreview({
    defaultValues,
    handleSubmit,
    isDisabled = false,
}: ParitalFormProps<LinkData>) {
    const { t } = useTranslation();

    return (
        <div className="w-full flex flex-col">
            <LinkCard
                label="Claim"
                src={defaultValues.image as string}
                message={defaultValues.description as string}
                title={defaultValues.name as string}
            />
            <FixedBottomButton disabled={isDisabled} onClick={handleSubmit as any}>
                Create
            </FixedBottomButton>
        </div>
    );
}
