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
import { useTokens } from "@/hooks/useTokens";
// Import our custom hook for form initialization
import { useLinkFormInitialization } from "@/hooks/useLinkFormInitialization";
import { useSkeletonLoading } from "@/hooks/useSkeletonLoading";
import { useLinkAction } from "@/hooks/useLinkAction";

export default function LinkDetails() {
    const { link } = useLinkAction();
    const { setButtonState, getUserInput } = useLinkCreationFormStore();
    const { getDisplayTokens } = useTokens();
    const { renderSkeleton } = useSkeletonLoading();

    // When this component mounts, we'll receive the button state from the form
    useEffect(() => {
        // Initially set button as disabled until the form updates it
        setButtonState({
            label: "Continue",
            isDisabled: true,
        });
    }, []);
    // Get tokens data
    const allAvailableTokens = getDisplayTokens();

    // Get current input from store
    const currentInput = link?.id ? getUserInput(link.id) : undefined;

    // Initialize form values using our custom hook
    const initialFormValues = useLinkFormInitialization(currentInput, allAvailableTokens, link);

    if (!link) {
        return renderSkeleton();
    }

    const getLinkForm = () => {
        switch (link?.linkType) {
            case LINK_TYPE.SEND_TOKEN_BASKET:
                return <SendTokenBasketForm initialValues={initialFormValues} />;
            case LINK_TYPE.SEND_AIRDROP:
                return <SendAirdropForm initialValues={initialFormValues} />;
            case LINK_TYPE.SEND_TIP:
                return <SendTipForm initialValues={initialFormValues} />;
            case LINK_TYPE.RECEIVE_PAYMENT:
                return <ReceivePaymentForm initialValues={initialFormValues} />;
            default:
                return null;
        }
    };

    return <div className="w-full h-full flex flex-col overflow-hidden mt-2">{getLinkForm()}</div>;
}
