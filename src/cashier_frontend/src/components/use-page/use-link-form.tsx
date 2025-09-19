// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

import { FC } from "react";
import { Form } from "@/components/ui/form";
import { UseFormReturn } from "react-hook-form";
import { z } from "zod";
import { LinkDetailModel } from "@/services/types/link.service.types";
import UseLinkOptions from "./use-link-options";
import UseActionButton from "./use-action-button";
import { UseSchema } from "./use-link-options";

interface UsePageFormProps {
  form: UseFormReturn<z.infer<typeof UseSchema>>;
  formData: LinkDetailModel;
  onSubmit: (address?: string) => void;
  onBack?: () => void;
  isDisabled: boolean;
  setDisabled: (disabled: boolean) => void;
  buttonText: string;
  onOpenWalletModal?: () => void;
}

const UseLinkForm: FC<UsePageFormProps> = ({
  form,
  formData,
  isDisabled,
  setDisabled,
  buttonText,
  onOpenWalletModal,
  onSubmit,
}) => {
  const handleSubmit = () => {
    setDisabled(true);
    onSubmit();
  };

  return (
    <div className="w-full flex flex-col flex-grow relative">
      <Form {...form}>
        <form className="w-full flex flex-col gap-3 h-full">
          <UseLinkOptions
            form={form}
            formData={formData}
            setDisabled={setDisabled}
            onOpenWalletModal={onOpenWalletModal}
          />
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
