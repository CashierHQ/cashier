import { ParitalFormProps } from "@/components/multi-step-form";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";

interface LinkData {
    linkName: string;
    photo: string;
    message: string;
}

export default function LinkPreview({ defaultValues, handleSubmit }: ParitalFormProps<LinkData>) {
    const { t } = useTranslation();

    return (
        <div className="w-full flex flex-col items-center gap-y-3">
            <div className="flex flex-col items-center p-3 mx-5 border-[1px]">
                <img src={defaultValues.photo} alt="Link preview" />
                <h2 className="text-lg font-semibold">{defaultValues.linkName}</h2>
                <p>{defaultValues.message}</p>
            </div>
            <Button onClick={(e) => handleSubmit({} as any)}>{t("submit")}</Button>
        </div>
    );
}
