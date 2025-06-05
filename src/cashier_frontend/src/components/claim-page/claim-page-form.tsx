// Cashier — No-code blockchain transaction builder
// Copyright (C) 2025 TheCashierApp LLC
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with this program.  If not, see <https://www.gnu.org/licenses/>.

import React from "react";
import { Form } from "@/components/ui/form";
import { UseFormReturn } from "react-hook-form";
import { ClaimSchema } from "@/pages/[id]";
import { z } from "zod";
import { LinkDetailModel } from "@/services/types/link.service.types";
import ClaimFormOptions from "./claim-form-options";
import UseActionButton from "./claim-action-button";

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

export default ClaimPageForm;
