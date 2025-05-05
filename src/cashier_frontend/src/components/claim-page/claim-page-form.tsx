import React, { useState } from "react";
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
    isDisabled?: boolean;
    setDisabled?: (disabled: boolean) => void;
    buttonText?: string;
}

const ClaimPageForm: React.FC<ClaimPageFormProps> = ({
    form,
    formData,
    onSubmit,
    isDisabled = true,
    setDisabled,
    buttonText,
}) => {
    const [buttonDisabled, setButtonDisabled] = useState<boolean>(isDisabled);

    // Function to manage disabled state for both components
    const updateDisabledState = (disabled: boolean) => {
        setButtonDisabled(disabled);
        if (setDisabled) {
            setDisabled(disabled);
        }
    };

    const handleSubmit = () => {
        // Disable the button immediately on submission
        updateDisabledState(true);
        onSubmit(form.getValues("address") ?? "");
    };

    return (
        <div className="w-full flex flex-col flex-grow relative">
            <Form {...form}>
                <form
                    className="w-full flex flex-col gap-y-[10px] mt-5 h-full"
                    onSubmit={(e) => {
                        e.preventDefault();
                        handleSubmit();
                    }}
                >
                    <ClaimFormOptions
                        form={form}
                        formData={formData}
                        setDisabled={updateDisabledState}
                    />

                    <ClaimActionButton
                        isDisabled={buttonDisabled}
                        buttonText={buttonText}
                        onSubmit={handleSubmit}
                        setDisabled={updateDisabledState}
                    />
                </form>
            </Form>
        </div>
    );
};

export default ClaimPageForm;
