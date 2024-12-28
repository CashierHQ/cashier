import { FixedBottomButton } from "@/components/fix-bottom-button";
import LinkCard from "@/components/link-card";
import { ParitalFormProps } from "@/components/multi-step-form";
import { LINK_TEMPLATE_DESCRIPTION_MESSAGE } from "@/constants/message";
import { LINK_TYPE } from "@/services/types/enum";

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
    console.log(linkType);
    if (linkType === LINK_TYPE.TIP_LINK) {
        return (
            <div className="w-full flex flex-col">
                <LinkCard
                    label="Tip"
                    src="/icpLogo.png"
                    message={LINK_TEMPLATE_DESCRIPTION_MESSAGE.TIP}
                    title={defaultValues.title as string}
                />
                <FixedBottomButton disabled={isDisabled} onClick={handleSubmit}>
                    Create
                </FixedBottomButton>
            </div>
        );
    }

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
