import LinkCard from "@/components/link-card";
import { ParitalFormProps } from "@/components/multi-step-form";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";

interface LinkData {
    name: string;
    photo: string;
    message: string;
}

export default function LinkPreview({ defaultValues, handleSubmit }: ParitalFormProps<LinkData>) {
    const { t } = useTranslation();

    console.log(defaultValues);

    return (
        <div className="w-full flex flex-col items-center gap-y-3">
            <LinkCard label="Claim" src={defaultValues.photo as any} message={defaultValues.message as any} title={defaultValues.name as any} />
            <Button type="submit" className="fixed bottom-[30px] w-[80vw] max-w-[350px] left-1/2 -translate-x-1/2">{t("submit")}</Button>
        </div>
    );
}
