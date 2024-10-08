import LinkCard from "@/components/link-card";
import { ParitalFormProps } from "@/components/multi-step-form";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";

interface LinkData {
    name: string;
    image: string;
    description: string;
}

export default function LinkPreview({ defaultValues, handleSubmit }: ParitalFormProps<LinkData>) {
    const { t } = useTranslation();

    return (
        <div className="w-full flex flex-col items-center gap-y-3">
            <LinkCard
                label="Claim"
                src={defaultValues.image as any}
                message={defaultValues.description as any}
                title={defaultValues.name as any}
            />
            <Button
                onClick={handleSubmit as any}
                className="flex w-full max-w-[350px] mt-5 mx-auto"
            >
                Create
            </Button>
        </div>
    );
}
