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

import { useEffect } from "react";
import { useLinkActionStore } from "@/stores/linkActionStore";
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

export default function LinkDetails() {
    const { link } = useLinkActionStore();
    const { setButtonState, getUserInput } = useLinkCreationFormStore();
    const { getDisplayTokens } = useTokens();
    const { renderSkeleton } = useSkeletonLoading();

    // Get tokens data
    const allAvailableTokens = getDisplayTokens();

    // Get current input from store
    const currentInput = link?.id ? getUserInput(link.id) : undefined;

    if (!link) {
        return renderSkeleton();
    }

    // Initialize form values using our custom hook
    const initialFormValues = useLinkFormInitialization(currentInput, allAvailableTokens, link);

    // When this component mounts, we'll receive the button state from the form
    useEffect(() => {
        // Initially set button as disabled until the form updates it
        setButtonState({
            label: "Continue",
            isDisabled: true,
        });
    }, []);

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
