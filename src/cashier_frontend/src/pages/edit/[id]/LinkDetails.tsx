// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

import { useEffect } from "react";
import { useLinkCreationFormStore } from "@/stores/linkCreationFormStore";
import { LINK_TYPE } from "@/services/types/enum";
import {
  ReceivePaymentForm,
  SendAirdropForm,
  SendTipForm,
  SendTokenBasketForm,
} from "@/components/link-details/forms";
// Import our custom hook for form initialization
import { useLinkFormInitialization } from "@/hooks/useLinkFormInitialization";
import { useSkeletonLoading } from "@/hooks/useSkeletonLoading";
import { LinkDetailModel } from "@/services/types/link.service.types";
import { useTokensV2 } from "@/hooks/token/useTokensV2";

interface LinkDetailsProps {
  link?: LinkDetailModel;
  isUpdating: boolean;
}

export default function LinkDetails({ link, isUpdating }: LinkDetailsProps) {
  const { setButtonState, getUserInput } = useLinkCreationFormStore();
  const { displayTokens } = useTokensV2();
  const { renderSkeleton } = useSkeletonLoading();

  // When this component mounts, we'll receive the button state from the form
  useEffect(() => {
    // Initially set button as disabled until the form updates it
    setButtonState({
      label: "Continue",
      isDisabled: true,
    });
  }, []);
  // Get current input from store
  const currentInput = link?.id ? getUserInput(link.id) : undefined;

  // Initialize form values using our custom hook
  const initialFormValues = useLinkFormInitialization(
    currentInput,
    displayTokens,
    link,
  );

  if (!link) {
    return renderSkeleton();
  }

  const getLinkForm = () => {
    switch (link?.linkType) {
      case LINK_TYPE.SEND_TOKEN_BASKET:
        return (
          <SendTokenBasketForm
            link={link}
            isUpdating={isUpdating}
            initialValues={initialFormValues}
          />
        );
      case LINK_TYPE.SEND_AIRDROP:
        return (
          <SendAirdropForm
            link={link}
            isUpdating={isUpdating}
            initialValues={initialFormValues}
          />
        );
      case LINK_TYPE.SEND_TIP:
        return (
          <SendTipForm
            link={link}
            isUpdating={isUpdating}
            initialValues={initialFormValues}
          />
        );
      case LINK_TYPE.RECEIVE_PAYMENT:
        return (
          <ReceivePaymentForm
            link={link}
            isUpdating={isUpdating}
            initialValues={initialFormValues}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="w-full h-full flex flex-col overflow-hidden mt-2">
      {getLinkForm()}
    </div>
  );
}
