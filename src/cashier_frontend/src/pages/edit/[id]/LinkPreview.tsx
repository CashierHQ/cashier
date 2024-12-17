import { FixedBottomButton } from "@/components/fix-bottom-button";
import LinkCard from "@/components/link-card";
import { ParitalFormProps } from "@/components/multi-step-form";

interface LinkData {
    title: string;
    image: string;
    description: string;
}

export default function LinkPreview({
    defaultValues,
    handleSubmit,
    isDisabled = false,
}: ParitalFormProps<object, LinkData>) {
    return (
        <div className="w-full flex flex-col">
            <LinkCard
                label="Claim"
                src={defaultValues.image as string}
                message={defaultValues.description as string}
                title={defaultValues.title as string}
            />
            <FixedBottomButton disabled={isDisabled} onClick={handleSubmit}>
                Create
            </FixedBottomButton>
        </div>
    );
}
