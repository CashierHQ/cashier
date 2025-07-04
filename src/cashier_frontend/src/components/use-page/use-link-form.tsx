// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

import React from "react";
import { Form } from "@/components/ui/form";
import { UseFormReturn } from "react-hook-form";
import { z } from "zod";
import { LinkDetailModel } from "@/services/types/link.service.types";
import ClaimFormOptions from "./claim-form-options";
import UseActionButton from "./use-action-button";
import { UseSchema } from "@/pages/[id]/choose-wallet";

interface UsePageFormProps {
    form: UseFormReturn<z.infer<typeof UseSchema>>;
    formData: LinkDetailModel;
    onSubmit: (address: string | undefined) => void;
    onBack?: () => void;
    isDisabled: boolean;
    setDisabled: (disabled: boolean) => void;
    buttonText: string;
}

const UseLinkForm: React.FC<UsePageFormProps> = ({
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
        onSubmit(form.getValues("address"));
    };

    return (
        <div className="w-full flex flex-col flex-grow relative">
            <Form {...form}>
                <form className="w-full flex flex-col gap-3 h-full">
                    <ClaimFormOptions form={form} formData={formData} setDisabled={setDisabled} />
                    <UseActionButton
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

export default UseLinkForm;
