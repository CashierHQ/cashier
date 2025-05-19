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
import { AddAssetForm } from "@/components/link-details/add-asset-form";

export default function LinkDetails() {
    const { link } = useLinkActionStore();
    const { getUserInput, setButtonState } = useLinkCreationFormStore();
    // Determine if we need multi-asset mode based on link type
    const currentInput = link ? getUserInput(link.id) : undefined;
    const isMultiAsset = currentInput?.linkType === LINK_TYPE.SEND_TOKEN_BASKET;
    const isAirdrop = currentInput?.linkType === LINK_TYPE.SEND_AIRDROP;

    // When this component mounts, we'll receive the button state from the form
    useEffect(() => {
        // Initially set button as disabled until the form updates it
        setButtonState({
            label: "Continue",
            isDisabled: true,
        });
    }, []);

    return (
        <div className="w-full h-full flex flex-col overflow-hidden mt-2">
            <AddAssetForm isMultiAsset={isMultiAsset} isAirdrop={isAirdrop} />
        </div>
    );
}
