import { useLinkActionStore } from "@/stores/linkActionStore";
import { useLinkCreationFormStore } from "@/stores/linkCreationFormStore";
import { LINK_TYPE } from "@/services/types/enum";
import { AddAssetForm } from "@/components/link-details/add-asset-form";

export default function LinkDetails() {
    const { link } = useLinkActionStore();
    const { getUserInput } = useLinkCreationFormStore();
    // Determine if we need multi-asset mode based on link type
    const currentInput = link ? getUserInput(link.id) : undefined;
    const isMultiAsset = currentInput?.linkType === LINK_TYPE.SEND_TOKEN_BASKET;

    return (
        <div className="w-full h-full flex flex-col">
            <AddAssetForm isMultiAsset={isMultiAsset} />
        </div>
    );
}
