import React, { useEffect } from "react";
import { Form } from "@/components/ui/form";
import { UseFormReturn } from "react-hook-form";
import { ClaimSchema } from "@/pages/[id]";
import { z } from "zod";
import { LinkDetailModel } from "@/services/types/link.service.types";
import ClaimFormOptions from "./claim-form-options";
import ClaimActionButton from "./claim-action-button";

interface ClaimPageFormProps {
    form: UseFormReturn<z.infer<typeof ClaimSchema>>;
    formData: LinkDetailModel;
    onSubmit: (address: string) => void;
    onBack?: () => void;
    isDisabled: boolean;
    setDisabled: (disabled: boolean) => void;
    buttonText?: string;
}

const ClaimPageForm: React.FC<ClaimPageFormProps> = ({
    form,
    formData,
    onSubmit,
    isDisabled,
    setDisabled,
    buttonText,
}) => {
    const handleSubmit = () => {
        // Disable the button immediately on submission
        setDisabled(true);
        onSubmit(form.getValues("address") ?? "");
    };

    useEffect(() => {
        console.log("useEffect buttonDisabled", isDisabled);
    }, [isDisabled]);

    return (
        <div className="w-full flex flex-col flex-grow relative">
            <Form {...form}>
                <form
                    className="w-full flex flex-col gap-3 h-full"
                    onSubmit={(e) => {
                        e.preventDefault();
                        handleSubmit();
                    }}
                >
                    <ClaimFormOptions form={form} formData={formData} setDisabled={setDisabled} />

                    <ClaimActionButton
                        isDisabled={isDisabled}
                        buttonText={buttonText}
                        onSubmit={handleSubmit}
                        setDisabled={setDisabled}
                    />
                </form>
            </Form>
        </div>
    );
};

export default ClaimPageForm;
