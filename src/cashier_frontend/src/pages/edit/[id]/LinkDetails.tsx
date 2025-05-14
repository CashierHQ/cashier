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
