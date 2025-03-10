import { LINK_INTENT_LABEL, LINK_TYPE } from "@/services/types/enum";
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
                },
            ],
        });

        setLink(updatedLink);
        nextStep();
        setButtonDisabled(false);
    };

    const render = () => {
        switch (link!.linkType) {
            case LINK_TYPE.TIP_LINK:
                return (
                    <TipLinkAssetForm
                        onSubmit={handleSubmitTipLinkDetails}
                        isButtonDisabled={isButtonDisabled}
                    />
                );
            case LINK_TYPE.NFT_CREATE_AND_AIRDROP:
                // TODO: uncouple NftAssetForm from link details
                //return <NftAssetForm form={form} onChange={handleChange} onSubmit={handleSubmit} />;
                return null;
            default:
                return null;
        }
    };

    return render();
}
