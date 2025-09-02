import { UseFormReturn } from "react-hook-form";
import { Principal } from "@dfinity/principal";
import { IoWalletOutline } from "react-icons/io5";
import { IoMdClose } from "react-icons/io";
import { FaCheck } from "react-icons/fa";
import { ClipboardIcon } from "lucide-react";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form";
import { ErrorMessageWithIcon } from "../ui/error-message-with-icon";
import { IconInput } from "../icon-input";
import z from "zod";
import { WalletSchema } from "./wallet-selection-modal";

interface ManualAddressInputProps {
  form: UseFormReturn<z.infer<typeof WalletSchema>>;
  onSubmit: (address: string) => void;
}

export function validatePrincipalAddress(address: string): boolean {
  if (!address) return false;
  try {
    Principal.fromText(address);
    return true;
  } catch {
    return false;
  }
}

const ManualAddressInput = ({ form, onSubmit }: ManualAddressInputProps) => {
  const handlePasteClick = async (field: {
    onChange: (value: string) => void;
  }) => {
    try {
      const text = await navigator.clipboard.readText();
      field.onChange(text);
      validateAddress(text);
    } catch (err) {
      console.error("Failed to read clipboard contents: ", err);
    }
  };

  const validateAddress = (addressValue: string) => {
    try {
      if (addressValue) {
        Principal.fromText(addressValue);
        form.clearErrors("address");
      } else {
        form.clearErrors("address");
      }
    } catch {
      form.setError("address", {
        type: "manual",
        message: "wallet-format-error",
      });
    }
  };

  const addressValue = form.watch("address");
  const hasValidAddress =
    addressValue && validatePrincipalAddress(addressValue);

  return (
    <div>
      <Form {...form}>
        <FormField
          control={form.control}
          name="address"
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <IconInput
                  isCurrencyInput={false}
                  icon={
                    <IoWalletOutline color="#359F89" className="mr-2 h-6 w-6" />
                  }
                  rightIcon={
                    field.value && form.formState.errors.address ? (
                      <IoMdClose color="red" className="mr-1 h-5 w-5" />
                    ) : field.value && !form.formState.errors.address ? (
                      <FaCheck color="#36A18B" className="mr-1 h-5 w-5" />
                    ) : (
                      <ClipboardIcon color="#359F89" className="mr-2 h-5 w-5" />
                    )
                  }
                  onRightIconClick={() => {
                    if (field.value) {
                      field.onChange("");
                    } else {
                      handlePasteClick(field);
                    }
                  }}
                  placeholder="Type in address"
                  className="py-3 h-12 text-sm rounded-lg placeholder:text-primary"
                  onFocusShowIcon={true}
                  onFocusText={true}
                  {...field}
                  onChange={(e) => {
                    field.onChange(e);
                    validateAddress(e.target.value);
                  }}
                />
              </FormControl>
              {form.formState.errors.address?.message ===
              "wallet-format-error" ? (
                <ErrorMessageWithIcon message="The wallet format is incorrect. Please make sure you are entering the correct wallet." />
              ) : (
                <FormMessage />
              )}
            </FormItem>
          )}
        />
      </Form>
      {/* Action Button */}
      {hasValidAddress && (
        <div className="pt-4">
          <button
            type="button"
            className="w-full bg-primary text-white py-2 rounded-lg mt-2"
            onClick={() => onSubmit(addressValue)}
          >
            Save
          </button>
        </div>
      )}
    </div>
  );
};

export default ManualAddressInput;
