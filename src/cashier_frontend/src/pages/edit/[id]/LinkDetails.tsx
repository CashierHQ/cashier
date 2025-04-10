import { CHAIN, LINK_INTENT_LABEL } from "@/services/types/enum";
//import { NftAssetForm } from "@/components/link-details/nft-asset-form";
import { TipLinkAssetForm } from "@/components/link-details/tip-link-asset-form";
import { TipLinkAssetFormSchema } from "@/components/link-details/tip-link-asset-form.hooks";
import { useCreateLinkStore } from "@/stores/createLinkStore";
import { useSetTipLinkDetails } from "@/hooks/linkHooks";
import { useMultiStepFormContext } from "@/contexts/multistep-form-context";
import { useButtonState } from "@/hooks/useButtonState";

export default function LinkDetails() {
    const { nextStep } = useMultiStepFormContext();
    const { link, setLink } = useCreateLinkStore();
    const { mutateAsync: setTipLinkDetails } = useSetTipLinkDetails();
    const { isButtonDisabled, setButtonDisabled } = useButtonState();

    const handleSubmitTipLinkDetails = async (data: TipLinkAssetFormSchema) => {
        setButtonDisabled(true);
        const updatedLink = await setTipLinkDetails({
            link: link!,
            patch: [
                {
                    amount: data.amount,
                    address: data.tokenAddress,
                    label: LINK_INTENT_LABEL.INTENT_LABEL_WALLET_TO_LINK,
                    chain: CHAIN.IC,
                    totalClaim: 0n,
                },
            ],
        });

        setLink(updatedLink);
        nextStep();
        setButtonDisabled(false);
    };

    return (
        <div className="w-full h-full flex flex-col">
            <TipLinkAssetForm
                onSubmit={handleSubmitTipLinkDetails}
                isButtonDisabled={isButtonDisabled}
            />
        </div>
    );
}
