import ConfirmationPopup from "@/components/confirmation-popup";
import { FixedBottomButton } from "@/components/fix-bottom-button";
import LinkCard from "@/components/link-card";
import { ParitalFormProps } from "@/components/multi-step-form";
import { Button } from "@/components/ui/button";
import { DrawerTrigger, Drawer } from "@/components/ui/drawer";
import { useTranslation } from "react-i18next";

interface LinkData {
    name: string;
    image: string;
    description: string;
}

export default function LinkPreview({
    defaultValues,
    handleSubmit,
    isDisabled,
}: ParitalFormProps<LinkData>) {
    const { t } = useTranslation();

    return (
        <div className="w-full flex flex-col">
            <LinkCard
                label="Claim"
                src={defaultValues.image as any}
                message={defaultValues.description as any}
                title={defaultValues.name as any}
            />
            <FixedBottomButton onClick={handleSubmit as any}>Create</FixedBottomButton>
        </div>
    );
}
